import { runReviewDbExecute, runReviewDbQuery, type ReviewDbConnection } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
  changedRows?: number
}

export type HrEmployeeHistoryEvent =
  | 'HIRED'
  | 'MUTATION_BRANCH_DIV'
  | 'TEAM_CHANGE'
  | 'POSITION_CHANGE'
  | 'SUPERVISOR_CHANGE'
  | 'CONTRACT_CHANGE'
  | 'STATUS_CHANGE'
  | 'RESIGN_TERMINATE'
  | 'SALARY_CHANGE'
  | 'REHIRE'
  | 'AUTH_USER_MAPPING'
  | 'CORRECTION'

type InsertHistoryParams = {
  effectiveDate?: string | null
  prevValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  reason?: string | null
  detailJson?: Record<string, unknown> | null
}

type EmployeeRow = {
  id: number
  employeeCode?: string
  fullName?: string
  supervisorId: number | null
}

export async function insertEmployeeHistoryEvent(
  employeeId: number,
  eventType: HrEmployeeHistoryEvent,
  actorUserId: number,
  params: InsertHistoryParams = {},
): Promise<number> {
  const effectiveDate =
    params.effectiveDate ??
    new Date().toISOString().slice(0, 10)

  const prevValueJson =
    params.prevValue !== undefined && params.prevValue !== null
      ? JSON.stringify(params.prevValue)
      : null

  const newValueJson =
    params.newValue !== undefined && params.newValue !== null
      ? JSON.stringify(params.newValue)
      : null

  const detailJsonStr =
    params.detailJson !== undefined && params.detailJson !== null
      ? JSON.stringify(params.detailJson)
      : null

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_employee_history (
        employee_id,
        history_event,
        effective_date,
        prev_value_json,
        new_value_json,
        reason,
        actor_user_id,
        detail_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      employeeId,
      eventType,
      effectiveDate,
      prevValueJson,
      newValueJson,
      params.reason ?? null,
      actorUserId,
      detailJsonStr,
    ],
  )

  return Number(result.insertId ?? 0)
}

export async function detectSupervisorCycle(
  employeeId: number,
  newSupervisorId: number | null,
  conn?: ReviewDbConnection,
): Promise<boolean> {
  if (newSupervisorId === null || newSupervisorId === undefined) {
    return false
  }

  if (newSupervisorId === employeeId) {
    throw new Error('CIRCULAR')
  }

  const runQuery = async <T>(sql: string, values: unknown[] = []): Promise<T[]> => {
    if (conn) {
      const [rows] = await conn.query(sql, values)
      return rows as T[]
    }
    return runReviewDbQuery<T>(sql, values)
  }

  let currentSupervisorId: number | null = newSupervisorId
  const visited = new Set<number>()
  visited.add(employeeId)

  let depth = 0
  const maxDepth = 50

  while (currentSupervisorId !== null && depth < maxDepth) {
    depth++

    if (visited.has(currentSupervisorId)) {
      if (currentSupervisorId === employeeId) {
        throw new Error('CIRCULAR')
      }
      return true
    }

    visited.add(currentSupervisorId)

    const rows: EmployeeRow[] = await runQuery<EmployeeRow>(
      `
        SELECT id, supervisor_id AS supervisorId
        FROM hr_employees
        WHERE id = ?
        LIMIT 1
      `,
      [currentSupervisorId],
    )

    const row: EmployeeRow | undefined = rows[0]
    if (!row) {
      return false
    }

    currentSupervisorId = row.supervisorId ?? null
  }

  if (depth >= maxDepth) {
    return true
  }

  return false
}

export async function backfillPositionMasterFromExistingFreeText(): Promise<{
  totalBackfilled: number
  totalSkipped: number
}> {
  const distinctPositions = await runReviewDbQuery<{ positionName: string | null }>(
    `
      SELECT DISTINCT TRIM(position_name) AS positionName
      FROM hr_employees
      WHERE position_name IS NOT NULL
        AND TRIM(position_name) <> ''
    `,
  )

  let totalBackfilled = 0
  let totalSkipped = 0

  for (const row of distinctPositions) {
    const positionName = String(row.positionName ?? '').trim()
    if (!positionName) {
      totalSkipped++
      continue
    }

    const slugBase = positionName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const existing = await runReviewDbQuery<{ id: number }>(
      `
        SELECT id
        FROM org_positions
        WHERE UPPER(position_name) = UPPER(?)
        LIMIT 1
      `,
      [positionName],
    )

    if (existing.length > 0) {
      const positionId = existing[0].id
      const updateResult = await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE hr_employees
          SET position_id = ?
          WHERE position_id IS NULL
            AND UPPER(TRIM(position_name)) = UPPER(?)
        `,
        [positionId, positionName],
      )
      totalBackfilled += Number(updateResult.affectedRows ?? 0)
      continue
    }

    let positionCode = slugBase.toUpperCase()
    if (!positionCode) {
      positionCode = `POS-${Date.now()}`
    }

    let codeSuffix = 0
    let finalCode = positionCode
    while (true) {
      const codeExisting = await runReviewDbQuery<{ id: number }>(
        `
          SELECT id
          FROM org_positions
          WHERE position_code = ?
          LIMIT 1
        `,
        [finalCode],
      )
      if (codeExisting.length === 0) {
        break
      }
      codeSuffix++
      finalCode = `${positionCode}-${codeSuffix}`
    }

    const insertResult = await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO org_positions (
          position_code,
          position_name,
          active
        )
        VALUES (?, ?, 1)
      `,
      [finalCode, positionName],
    )

    if (insertResult.insertId) {
      const newPositionId = Number(insertResult.insertId)
      const updateResult = await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE hr_employees
          SET position_id = ?
          WHERE position_id IS NULL
            AND UPPER(TRIM(position_name)) = UPPER(?)
        `,
        [newPositionId, positionName],
      )
      totalBackfilled += Number(updateResult.affectedRows ?? 0)
    } else {
      totalSkipped++
    }
  }

  return { totalBackfilled, totalSkipped }
}

export async function backfillEmploymentStatusVarcharToEnum(): Promise<{
  totalMapped: number
  totalUnknown: number
  totalUpdated: number
}> {
  const statusMapping: Record<string, string> = {
    KARYAWAN: 'KARYAWAN',
    EMPLOYEE: 'KARYAWAN',
    AKTIF: 'KARYAWAN',
    ACTIVE: 'KARYAWAN',
    PKWT: 'PKWT',
    CONTRACT: 'PKWT',
    KONTRAK: 'PKWT',
    PKWTT: 'PKWTT',
    PERMANENT: 'PKWTT',
    TETAP: 'PKWTT',
    RESIGNED: 'RESIGNED',
    RESIGN: 'RESIGNED',
    MENGUNDURKAN_DIRI: 'RESIGNED',
    KELUAR: 'RESIGNED',
    TERMINATED: 'TERMINATED',
    PHK: 'TERMINATED',
    DIHENTIKAN: 'TERMINATED',
    PENSIUN: 'PENSIUN',
    RETIRED: 'PENSIUN',
    PENSION: 'PENSIUN',
    ARCHIVED: 'ARCHIVED',
    ARSIP: 'ARCHIVED',
    NONAKTIF: 'ARCHIVED',
    INACTIVE: 'ARCHIVED',
  }

  const allRows = await runReviewDbQuery<{
    id: number
    employmentStatus: string | null
  }>(
    `
      SELECT id, employment_status AS employmentStatus
      FROM hr_employees
    `,
  )

  let totalMapped = 0
  let totalUnknown = 0
  let totalUpdated = 0

  for (const row of allRows) {
    const rawStatus = String(row.employmentStatus ?? 'KARYAWAN').trim().toUpperCase()
    if (!rawStatus) {
      continue
    }
    const mapped = statusMapping[rawStatus]
    if (mapped) {
      totalMapped++
      if (mapped !== rawStatus) {
        const result = await runReviewDbExecute<ExecuteResult>(
          `
            UPDATE hr_employees
            SET employment_status = ?
            WHERE id = ?
          `,
          [mapped, row.id],
        )
        totalUpdated += Number(result.affectedRows ?? 0)
      }
    } else {
      totalUnknown++
      const fallbackResult = await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE hr_employees
          SET employment_status = 'KARYAWAN'
          WHERE id = ?
            AND employment_status <> 'KARYAWAN'
        `,
        [row.id],
      )
      totalUpdated += Number(fallbackResult.affectedRows ?? 0)
    }
  }

  return { totalMapped, totalUnknown, totalUpdated }
}
