import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { normalizeDailyActivityDivisionName, normalizeDailyActivitySubdivisionName } from '@/lib/daily-activity-org'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
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
      activityId?: unknown
      decision?: unknown
      approvalNotes?: unknown
    }

    const activityId = Number.parseInt(String(payload.activityId ?? '0').trim(), 10)
    const decision = String(payload.decision ?? '')
      .trim()
      .toUpperCase()
    const approvalNotes = String(payload.approvalNotes ?? '').trim()

    if (!Number.isInteger(activityId) || activityId <= 0) {
      return Response.json({ message: 'Aktivitas yang akan di-approve wajib dipilih.' }, { status: 400 })
    }
    if (!allowedDecisions.has(decision)) {
      return Response.json({ message: 'Keputusan approval tidak valid.' }, { status: 400 })
    }
    if (decision === 'REJECTED' && !approvalNotes) {
      return Response.json({ message: 'Catatan reject wajib diisi.' }, { status: 400 })
    }

    await ensureDailyActivityTable()

    const [activity] = await runReviewDbQuery<ActivityRow>(
      `
        SELECT
          id,
          activity_code AS activityCode,
          execution_status AS executionStatus,
          approval_status AS approvalStatus,
          division_name AS divisionName,
          subdivision_name AS subdivisionName
        FROM daily_activity_items
        WHERE id = ?
        LIMIT 1
      `,
      [activityId],
    )

    if (!activity) {
      return Response.json({ message: 'Aktivitas harian tidak ditemukan.' }, { status: 404 })
    }

    const executionStatus = String(activity.executionStatus).trim().toUpperCase()
    if (executionStatus !== 'DONE' && executionStatus !== 'PENDING') {
      return Response.json({ message: 'Aktivitas harus sudah di-close sebelum bisa di-approve.' }, { status: 400 })
    }

    const currentApproval = String(activity.approvalStatus ?? '').trim().toUpperCase()
    if (currentApproval !== 'PENDING') {
      return Response.json({ message: 'Aktivitas ini tidak berada pada status menunggu approval.' }, { status: 400 })
    }

    if (session.role !== 'SUPER_ADMIN') {
      const userOrg = await resolveDailyActivityOrgContext(session)
      const sameDivision =
        normalizeDailyActivityDivisionName(String(activity.divisionName ?? '')) ===
        normalizeDailyActivityDivisionName(userOrg.divisionName)
      const sameSubdivision =
        normalizeDailyActivitySubdivisionName(String(activity.subdivisionName ?? '')) ===
        normalizeDailyActivitySubdivisionName(userOrg.subdivisionName)
      if (!sameDivision || !sameSubdivision) {
        return Response.json({ message: 'Approval hanya diizinkan untuk divisi/sub-divisi Anda.' }, { status: 403 })
      }
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE daily_activity_items
        SET
          approval_status = ?,
          approval_notes = ?,
          approved_by_username = ?,
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [decision, approvalNotes || null, session.username, session.displayName, activityId],
    )

    return Response.json({
      message:
        decision === 'APPROVED'
          ? `Aktivitas ${activity.activityCode} berhasil di-approve.`
          : `Aktivitas ${activity.activityCode} berhasil di-reject.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
