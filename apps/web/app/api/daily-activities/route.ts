import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import {
  isValidDailyActivityDivision,
  isValidDailyActivityPlanningLevel,
  isValidDailyActivitySubdivision,
} from '@/lib/daily-activity-org'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute } from '@/lib/review-db'
import { ensureDailyActivityTable, generateDailyActivityCode } from '@/lib/services/daily-activity-service'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

const allowedPriorityLevels = new Set(['HIGH', 'MEDIUM', 'LOW'])

function normalizeActivityDate(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'daily_activity', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Daily activity hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      activityDate?: unknown
      planningLevel?: unknown
      divisionName?: unknown
      subdivisionName?: unknown
      taskTitle?: unknown
      taskDetail?: unknown
      successMetric?: unknown
      priorityLevel?: unknown
    }

    const activityDate = normalizeActivityDate(payload.activityDate)
    let planningLevel = String(payload.planningLevel ?? '')
      .trim()
      .toUpperCase()
    let divisionName = String(payload.divisionName ?? '').trim()
    let subdivisionName = String(payload.subdivisionName ?? '').trim()
    const taskTitle = String(payload.taskTitle ?? '').trim()
    const taskDetail = String(payload.taskDetail ?? '').trim()
    const successMetric = String(payload.successMetric ?? '').trim()
    const priorityLevel = String(payload.priorityLevel ?? 'MEDIUM')
      .trim()
      .toUpperCase()

    if (session.role !== 'SUPER_ADMIN') {
      const userOrg = await resolveDailyActivityOrgContext(session)
      planningLevel = userOrg.planningLevel
      divisionName = userOrg.divisionName
      subdivisionName = userOrg.subdivisionName
    }

    if (!activityDate || Number.isNaN(new Date(activityDate).getTime())) {
      return Response.json({ message: 'Tanggal daily activity wajib valid.' }, { status: 400 })
    }
    if (!taskTitle) {
      return Response.json({ message: 'Judul aktivitas harian wajib diisi.' }, { status: 400 })
    }
    if (!isValidDailyActivityPlanningLevel(planningLevel)) {
      return Response.json({ message: 'Level plan daily activity wajib memilih Manager, SPV, atau Leader.' }, { status: 400 })
    }
    if (!isValidDailyActivityDivision(divisionName)) {
      return Response.json({ message: 'Divisi daily activity wajib dipilih dari baseline organisasi.' }, { status: 400 })
    }
    if (!isValidDailyActivitySubdivision(divisionName, subdivisionName)) {
      return Response.json({ message: 'Sub-divisi daily activity tidak valid untuk divisi yang dipilih.' }, { status: 400 })
    }
    if (!successMetric) {
      return Response.json({ message: 'Target/indikator hasil wajib diisi agar aktivitas terukur.' }, { status: 400 })
    }
    if (!allowedPriorityLevels.has(priorityLevel)) {
      return Response.json({ message: 'Prioritas aktivitas tidak valid.' }, { status: 400 })
    }

    await ensureDailyActivityTable()
    const activityCode = await generateDailyActivityCode(activityDate)

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO daily_activity_items (
          activity_code,
          activity_date,
          planned_username,
          planned_by,
          role_code,
          planning_level,
          division_name,
          subdivision_name,
          task_title,
          task_detail,
          success_metric,
          priority_level,
          execution_status,
          planned_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLANNED', CURRENT_TIMESTAMP)
      `,
      [
        activityCode,
        activityDate,
        session.username,
        session.displayName,
        session.role,
        planningLevel,
        divisionName,
        subdivisionName || null,
        taskTitle,
        taskDetail || null,
        successMetric,
        priorityLevel,
      ],
    )

    return Response.json({
      message: `Plan harian ${activityCode} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
