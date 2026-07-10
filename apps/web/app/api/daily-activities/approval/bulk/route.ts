import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { normalizeDailyActivityDivisionName, normalizeDailyActivitySubdivisionName } from '@/lib/daily-activity-org'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import { ensureDailyActivityTable } from '@/lib/services/daily-activity-service'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type ActivityRow = {
  id: number
  activityCode: string
  executionStatus: string
  approvalStatus: string | null
  divisionName: string | null
  subdivisionName: string | null
}

const allowedDecisions = new Set(['APPROVED', 'REJECTED'])

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'daily_activity', 'approve')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Approval daily activity hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      activityIds?: unknown
      decision?: unknown
      approvalNotes?: unknown
    }

    const rawIds = Array.isArray(payload.activityIds) ? payload.activityIds : []
    const activityIds = Array.from(
      new Set(
        rawIds
          .map((value) => Number.parseInt(String(value ?? '0').trim(), 10))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    )
    const decision = String(payload.decision ?? '')
      .trim()
      .toUpperCase()
    const approvalNotes = String(payload.approvalNotes ?? '').trim()

    if (activityIds.length === 0) {
      return Response.json({ message: 'Pilih minimal satu aktivitas untuk diproses.' }, { status: 400 })
    }
    if (activityIds.length > 20) {
      return Response.json({ message: 'Maksimal 20 aktivitas per batch approval.' }, { status: 400 })
    }
    if (!allowedDecisions.has(decision)) {
      return Response.json({ message: 'Keputusan approval tidak valid.' }, { status: 400 })
    }
    if (decision === 'REJECTED' && !approvalNotes) {
      return Response.json({ message: 'Catatan reject wajib diisi.' }, { status: 400 })
    }

    await ensureDailyActivityTable()

    const placeholders = activityIds.map(() => '?').join(',')
    const activities = await runReviewDbQuery<ActivityRow>(
      `
        SELECT
          id,
          activity_code AS activityCode,
          execution_status AS executionStatus,
          approval_status AS approvalStatus,
          division_name AS divisionName,
          subdivision_name AS subdivisionName
        FROM daily_activity_items
        WHERE id IN (${placeholders})
      `,
      activityIds,
    )

    if (activities.length !== activityIds.length) {
      return Response.json({ message: 'Sebagian aktivitas tidak ditemukan, batch dibatalkan.' }, { status: 404 })
    }

    const userOrg = session.role === 'SUPER_ADMIN' ? null : await resolveDailyActivityOrgContext(session)
    for (const item of activities) {
      const executionStatus = String(item.executionStatus).trim().toUpperCase()
      if (executionStatus !== 'DONE' && executionStatus !== 'PENDING') {
        return Response.json(
          { message: `Aktivitas ${item.activityCode} belum di-close, batch dibatalkan.` },
          { status: 400 },
        )
      }
      const currentApproval = String(item.approvalStatus ?? '').trim().toUpperCase()
      if (currentApproval !== 'PENDING') {
        return Response.json(
          { message: `Aktivitas ${item.activityCode} tidak berada pada status menunggu approval.` },
          { status: 400 },
        )
      }

      if (session.role !== 'SUPER_ADMIN') {
        const sameDivision =
          normalizeDailyActivityDivisionName(String(item.divisionName ?? '')) ===
          normalizeDailyActivityDivisionName(userOrg?.divisionName ?? '')
        const sameSubdivision =
          normalizeDailyActivitySubdivisionName(String(item.subdivisionName ?? '')) ===
          normalizeDailyActivitySubdivisionName(userOrg?.subdivisionName ?? '')
        if (!sameDivision || !sameSubdivision) {
          return Response.json(
            { message: `Aktivitas ${item.activityCode} di luar divisi/sub-divisi Anda, batch dibatalkan.` },
            { status: 403 },
          )
        }
      }
    }

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          UPDATE daily_activity_items
          SET
            approval_status = ?,
            approval_notes = ?,
            approved_by_username = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
        `,
        [decision, approvalNotes || null, session.username, session.displayName, ...activityIds],
      )
    })

    return Response.json({
      message:
        decision === 'APPROVED'
          ? `Berhasil approve ${activityIds.length} aktivitas.`
          : `Berhasil reject ${activityIds.length} aktivitas.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
