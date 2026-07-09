import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureDailyActivityTable } from '@/lib/services/daily-activity-service'

type ExportRow = {
  activityDate: string
  activityCode: string
  planningLevel: string
  divisionName: string | null
  subdivisionName: string | null
  taskTitle: string
  taskDetail: string | null
  successMetric: string | null
  priorityLevel: string
  executionStatus: string
  approvalStatus: string | null
  plannedBy: string
  plannedUsername: string
  plannedAt: string
  closedAt: string | null
  closeNotes: string | null
  pendingReason: string | null
  followUpAction: string | null
  approvedBy: string | null
  approvedAt: string | null
  approvalNotes: string | null
}

function getIsoDate(value: string | null) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (!Number.isFinite(date.getTime())) return null
  return value
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!canPerformAction(session.role, 'daily_activity', 'export')) {
    return new Response('Forbidden', { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return new Response('Export daily activity hanya aktif saat review DB benar-benar tersedia.', { status: 503 })
  }

  try {
    await ensureDailyActivityTable()

    const url = new URL(request.url)
    const from = getIsoDate(url.searchParams.get('from'))
    const to = getIsoDate(url.searchParams.get('to'))
    const divisionName = String(url.searchParams.get('divisionName') ?? '').trim()
    const subdivisionName = String(url.searchParams.get('subdivisionName') ?? '').trim()

    if (!from || !to) {
      return new Response('Parameter from/to wajib diisi.', { status: 400 })
    }
    if (from > to) {
      return new Response('Rentang tanggal tidak valid.', { status: 400 })
    }

    const roleMeta = getRoleMeta(session.role)
    const effectiveDivision = session.role === 'SUPER_ADMIN' ? divisionName : roleMeta.division
    const effectiveSubdivision =
      session.role === 'SUPER_ADMIN' ? (subdivisionName ? subdivisionName : null) : roleMeta.subdivision

    const filterDivision = effectiveDivision ? 'AND COALESCE(division_name, \'\') = ?' : ''
    const filterSubdivision =
      typeof effectiveSubdivision === 'string' ? 'AND COALESCE(subdivision_name, \'\') = ?' : ''

    const args = [from, to]
    if (effectiveDivision) args.push(effectiveDivision)
    if (typeof effectiveSubdivision === 'string') args.push(effectiveSubdivision)

    const rows = await runReviewDbQuery<ExportRow>(
      `
        SELECT
          CAST(activity_date AS CHAR) AS activityDate,
          activity_code AS activityCode,
          planning_level AS planningLevel,
          division_name AS divisionName,
          subdivision_name AS subdivisionName,
          task_title AS taskTitle,
          task_detail AS taskDetail,
          success_metric AS successMetric,
          priority_level AS priorityLevel,
          execution_status AS executionStatus,
          approval_status AS approvalStatus,
          planned_by AS plannedBy,
          planned_username AS plannedUsername,
          CAST(planned_at AS CHAR) AS plannedAt,
          CAST(closed_at AS CHAR) AS closedAt,
          close_notes AS closeNotes,
          pending_reason AS pendingReason,
          follow_up_action AS followUpAction,
          approved_by AS approvedBy,
          CAST(approved_at AS CHAR) AS approvedAt,
          approval_notes AS approvalNotes
        FROM daily_activity_items
        WHERE activity_date BETWEEN ? AND ?
          ${filterDivision}
          ${filterSubdivision}
        ORDER BY activity_date ASC, planned_at ASC, id ASC
      `,
      args,
    )

    const header = [
      'activity_date',
      'activity_code',
      'planning_level',
      'division',
      'subdivision',
      'task_title',
      'task_detail',
      'success_metric',
      'priority_level',
      'execution_status',
      'approval_status',
      'planned_by',
      'planned_username',
      'planned_at',
      'closed_at',
      'close_notes',
      'pending_reason',
      'follow_up_action',
      'approved_by',
      'approved_at',
      'approval_notes',
    ].join(',')

    const lines = rows.map((row) =>
      [
        row.activityDate,
        row.activityCode,
        row.planningLevel,
        row.divisionName ?? '',
        row.subdivisionName ?? '',
        row.taskTitle,
        row.taskDetail ?? '',
        row.successMetric ?? '',
        row.priorityLevel,
        row.executionStatus,
        row.approvalStatus ?? '',
        row.plannedBy,
        row.plannedUsername,
        row.plannedAt,
        row.closedAt ?? '',
        row.closeNotes ?? '',
        row.pendingReason ?? '',
        row.followUpAction ?? '',
        row.approvedBy ?? '',
        row.approvedAt ?? '',
        row.approvalNotes ?? '',
      ].map(escapeCsv).join(','),
    )

    const csv = [header, ...lines].join('\n')
    const filename = `daily-activity_${from}_to_${to}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return new Response(getReviewDbErrorDetail(error), { status: 500 })
  }
}
