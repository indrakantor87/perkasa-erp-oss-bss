import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureDailyActivityTable } from '@/lib/services/daily-activity-service'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type ActivityRow = {
  id: number
  activityCode: string
  plannedUsername: string
  executionStatus: string
  approvalStatus: string | null
}

const allowedStatuses = new Set(['DONE', 'PENDING'])

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'daily_activity', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Closing daily activity hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      activityId?: unknown
      executionStatus?: unknown
      closeNotes?: unknown
      pendingReason?: unknown
      followUpAction?: unknown
    }

    const activityId = Number.parseInt(String(payload.activityId ?? '0').trim(), 10)
    const executionStatus = String(payload.executionStatus ?? '')
      .trim()
      .toUpperCase()
    const closeNotes = String(payload.closeNotes ?? '').trim()
    const pendingReason = String(payload.pendingReason ?? '').trim()
    const followUpAction = String(payload.followUpAction ?? '').trim()

    if (!Number.isInteger(activityId) || activityId <= 0) {
      return Response.json({ message: 'Aktivitas yang akan di-close wajib dipilih.' }, { status: 400 })
    }
    if (!allowedStatuses.has(executionStatus)) {
      return Response.json({ message: 'Status closing daily activity tidak valid.' }, { status: 400 })
    }
    if (executionStatus === 'DONE' && !closeNotes) {
      return Response.json({ message: 'Hasil realisasi wajib diisi saat aktivitas dinyatakan selesai.' }, { status: 400 })
    }
    if (executionStatus === 'PENDING' && (!pendingReason || !followUpAction)) {
      return Response.json(
        { message: 'Alasan pending dan aksi lanjut wajib diisi agar aktivitas tetap terukur.' },
        { status: 400 },
      )
    }

    await ensureDailyActivityTable()

    const [activity] = await runReviewDbQuery<ActivityRow>(
      `
        SELECT
          id,
          activity_code AS activityCode,
          planned_username AS plannedUsername,
          execution_status AS executionStatus,
          approval_status AS approvalStatus
        FROM daily_activity_items
        WHERE id = ?
        LIMIT 1
      `,
      [activityId],
    )

    if (!activity) {
      return Response.json({ message: 'Aktivitas harian tidak ditemukan.' }, { status: 404 })
    }
    if (
      session.role !== 'SUPER_ADMIN' &&
      String(activity.plannedUsername).trim().toLowerCase() !== session.username.trim().toLowerCase()
    ) {
      return Response.json({ message: 'Anda hanya bisa melakukan closing untuk aktivitas harian milik sendiri.' }, { status: 403 })
    }
    const currentStatus = String(activity.executionStatus).trim().toUpperCase()
    const approvalStatus = String(activity.approvalStatus ?? '').trim().toUpperCase()
    if (currentStatus !== 'PLANNED' && approvalStatus !== 'REJECTED') {
      return Response.json(
        { message: 'Aktivitas ini sudah pernah di-close dan masih menunggu approval atau sudah di-approve.' },
        { status: 400 },
      )
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE daily_activity_items
        SET
          execution_status = ?,
          approval_status = 'PENDING',
          approval_notes = NULL,
          approved_by_username = NULL,
          approved_by = NULL,
          approved_at = NULL,
          close_notes = ?,
          pending_reason = ?,
          follow_up_action = ?,
          closed_by_username = ?,
          closed_by = ?,
          closed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        executionStatus,
        closeNotes || null,
        pendingReason || null,
        followUpAction || null,
        session.username,
        session.displayName,
        activityId,
      ],
    )

    return Response.json({
      message:
        executionStatus === 'DONE'
          ? `Aktivitas ${activity.activityCode} berhasil di-close sebagai selesai.`
          : `Aktivitas ${activity.activityCode} berhasil di-close sebagai pending.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
