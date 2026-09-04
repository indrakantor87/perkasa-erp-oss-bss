import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import {
  isValidDailyActivityDivision,
  isValidDailyActivityPlanningLevel,
  isValidDailyActivitySubdivision,
  normalizeDailyActivityDivisionName,
  normalizeDailyActivitySubdivisionName,
} from '@/lib/daily-activity-org'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbTransaction } from '@/lib/review-db'
import { ensureDailyActivityTable, generateDailyActivityCode } from '@/lib/services/daily-activity-service'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'
import { mapUiStatusToExecutionStatus, type DailyActivityUiStatus, UI_STATUSES } from '@/lib/smart-paste-parser'

const allowedPriorityLevels = new Set(['HIGH', 'MEDIUM', 'LOW'])
const UI_STATUS_SET = new Set<string>(UI_STATUSES)
const MAX_ITEMS = 50
const MAX_TITLE_LEN = 180

function normalizeActivityDate(value: unknown): string {
  return String(value ?? '').trim()
}

function truncate80(s: string): string {
  return s.length > 80 ? s.slice(0, 77).trim() + '...' : s
}

type BatchItemInput = { activityText?: unknown; status?: unknown }

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
      priorityLevel?: unknown
      items?: unknown
    }

    const activityDate = normalizeActivityDate(payload.activityDate)
    let planningLevel = String(payload.planningLevel ?? '').trim().toUpperCase()
    let divisionName = normalizeDailyActivityDivisionName(String(payload.divisionName ?? ''))
    let subdivisionName = normalizeDailyActivitySubdivisionName(String(payload.subdivisionName ?? ''))
    const priorityLevelRaw = String(payload.priorityLevel ?? 'MEDIUM').trim().toUpperCase()
    const priorityLevel = allowedPriorityLevels.has(priorityLevelRaw) ? priorityLevelRaw : 'MEDIUM'

    if (session.role !== 'SUPER_ADMIN') {
      const userOrg = await resolveDailyActivityOrgContext(session)
      planningLevel = userOrg.planningLevel
      divisionName = userOrg.divisionName
      subdivisionName = userOrg.subdivisionName
    } else {
      divisionName = normalizeDailyActivityDivisionName(divisionName)
      subdivisionName = normalizeDailyActivitySubdivisionName(subdivisionName)
    }

    if (!activityDate || Number.isNaN(new Date(activityDate).getTime())) {
      return Response.json({ message: 'Tanggal daily activity wajib valid.' }, { status: 400 })
    }
    if (!isValidDailyActivityPlanningLevel(planningLevel)) {
      return Response.json(
        { message: 'Level plan daily activity wajib memilih Manager, SPV, atau Leader.' },
        { status: 400 },
      )
    }
    if (!isValidDailyActivityDivision(divisionName)) {
      return Response.json(
        { message: 'Divisi daily activity wajib dipilih dari baseline organisasi.' },
        { status: 400 },
      )
    }
    if (!isValidDailyActivitySubdivision(divisionName, subdivisionName)) {
      return Response.json(
        { message: 'Sub-divisi daily activity tidak valid untuk divisi yang dipilih.' },
        { status: 400 },
      )
    }

    const rawItems = Array.isArray(payload.items) ? (payload.items as BatchItemInput[]) : []
    if (rawItems.length === 0) {
      return Response.json(
        { message: 'Belum ada aktivitas yang dapat disimpan. Silakan paste teks atau tambahkan satu per satu.' },
        { status: 400 },
      )
    }
    if (rawItems.length > MAX_ITEMS) {
      return Response.json(
        { message: `Maksimal ${MAX_ITEMS} aktivitas per batch simpan (saat ini ${rawItems.length}).` },
        { status: 400 },
      )
    }

    const normalizedItems: Array<{ taskTitle: string; executionStatus: 'PLANNED' | 'DONE' | 'PENDING' | 'CANCEL'; uiStatus: DailyActivityUiStatus }> = []
    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i]
      const taskTitle = String(raw?.activityText ?? '').replace(/\s+/g, ' ').trim()
      const statusRaw = String(raw?.status ?? 'OPEN').trim().toUpperCase() as DailyActivityUiStatus
      if (!taskTitle) {
        return Response.json(
          { message: `Aktivitas nomor ${i + 1} kosong. Isi teks atau hapus barisnya.`, errorIndex: i },
          { status: 400 },
        )
      }
      if (taskTitle.length > MAX_TITLE_LEN) {
        return Response.json(
          { message: `Aktivitas nomor ${i + 1} terlalu panjang (maks ${MAX_TITLE_LEN} karakter).`, errorIndex: i },
          { status: 400 },
        )
      }
      if (!UI_STATUS_SET.has(statusRaw)) {
        return Response.json(
          { message: `Status aktivitas nomor ${i + 1} tidak valid (pilih OPEN/PENDING/CLOSE/CANCEL).`, errorIndex: i },
          { status: 400 },
        )
      }
      normalizedItems.push({
        taskTitle,
        uiStatus: statusRaw,
        executionStatus: mapUiStatusToExecutionStatus(statusRaw),
      })
    }

    await ensureDailyActivityTable()

    const savedCodes: string[] = []

    await runReviewDbTransaction(async (connection) => {
      for (let i = 0; i < normalizedItems.length; i++) {
        const item = normalizedItems[i]
        const executionStatus = item.executionStatus
        const isClose = executionStatus === 'DONE'
        const approvalStatus: 'NONE' | 'PENDING' = isClose ? 'PENDING' : 'NONE'
        const taskDetail = item.taskTitle
        const successMetric = `Selesaikan ${truncate80(item.taskTitle)} dengan dokumentasi yang jelas.`

        let insertAttempts = 0
        let inserted = false
        let lastErr: unknown = null

        while (insertAttempts < 2 && !inserted) {
          insertAttempts++
          try {
            const activityCode = await generateDailyActivityCode(activityDate, connection)
            const closedAtExpr = isClose ? 'CURRENT_TIMESTAMP' : 'NULL'
            const insertSql = `
              INSERT INTO daily_activity_items (
                branch_id,
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
                approval_status,
                closed_at,
                planned_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${closedAtExpr}, CURRENT_TIMESTAMP)
            `
            const values = [
              session.branchId ?? null,
              activityCode,
              activityDate,
              session.username,
              session.displayName,
              session.role,
              planningLevel,
              divisionName,
              subdivisionName || null,
              item.taskTitle,
              taskDetail || null,
              successMetric,
              priorityLevel,
              executionStatus,
              approvalStatus,
            ]
            await connection.query(insertSql, values)
            savedCodes.push(activityCode)
            inserted = true
          } catch (err) {
            lastErr = err
            const msg = String(err instanceof Error ? err.message : err)
            const isUniqueCode = /duplicate/i.test(msg) && /activity_code/i.test(msg)
            if (!isUniqueCode || insertAttempts >= 2) {
              throw err
            }
          }
        }
        if (!inserted) {
          const cause = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'unknown')
          throw new Error(`Gagal menyimpan aktivitas nomor ${i + 1}: ${cause}`)
        }
      }
    })

    return Response.json({
      message: `Berhasil menyimpan ${savedCodes.length} aktivitas daily activity.`,
      savedCount: savedCodes.length,
      codes: savedCodes,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
