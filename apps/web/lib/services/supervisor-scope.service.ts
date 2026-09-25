import { runReviewDbQuery } from '@/lib/review-db'

type HrEmployeeRow = {
  id: number
  user_id: number | null
  supervisor_id: number | null
  is_active: number | null
}

export async function resolveDirectSubordinateEmployeeIds(
  supervisorAuthUserId: number | string,
): Promise<number[]> {
  const authUserIdNum = Number(supervisorAuthUserId)
  if (!Number.isFinite(authUserIdNum) || authUserIdNum <= 0) {
    return []
  }

  const supervisorRows = await runReviewDbQuery<HrEmployeeRow>(
    `
      SELECT id, user_id, supervisor_id, is_active
      FROM hr_employees
      WHERE user_id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [authUserIdNum],
  )

  const supervisorEmp = supervisorRows[0]
  if (!supervisorEmp) {
    return []
  }

  const subordinateRows = await runReviewDbQuery<{ id: number }>(
    `
      SELECT id
      FROM hr_employees
      WHERE supervisor_id = ?
        AND is_active = 1
    `,
    [supervisorEmp.id],
  )

  return subordinateRows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0)
}

export async function validateSupervisorChainNoCircularAndNoSelf(
  subordinateEmployeeId: number,
  claimedSupervisorEmployeeId: number,
): Promise<boolean> {
  const subId = Number(subordinateEmployeeId)
  const supId = Number(claimedSupervisorEmployeeId)

  if (!Number.isFinite(subId) || !Number.isFinite(supId)) {
    throw new Error('Invalid employee ID: must be numeric')
  }

  if (subId === supId) {
    throw new Error(`Supervisor chain SELF reference detected: employee ${subId} cannot be supervisor of itself`)
  }

  const visited = new Set<number>()
  let current: number | null = supId
  let depth = 0
  const MAX_DEPTH = 10

  while (depth < MAX_DEPTH && current !== null && current !== undefined) {
    if (visited.has(current)) {
      throw new Error(
        `Supervisor chain CIRCULAR reference detected at employee ${current}. Path visited: ${Array.from(visited).join(' -> ')} -> ${current}`,
      )
    }

    visited.add(current)

    if (current === subId) {
      throw new Error(
        `Supervisor chain CIRCULAR reference detected: subordinate ${subId} appears in supervisor chain of claimed supervisor ${supId}. Path: ${Array.from(visited).join(' -> ')}`,
      )
    }

    const parentRows: Array<{ supervisor_id: number | null }> = (await runReviewDbQuery<{ supervisor_id: number | null }>(
      `
        SELECT supervisor_id
        FROM hr_employees
        WHERE id = ?
        LIMIT 1
      `,
      [current],
    )) as Array<{ supervisor_id: number | null }>

    const parent: { supervisor_id: number | null } | undefined = parentRows[0]
    if (!parent || parent.supervisor_id === null || parent.supervisor_id === undefined) {
      break
    }

    current = Number(parent.supervisor_id)
    if (!Number.isFinite(current) || current <= 0) {
      break
    }

    depth++
  }

  return true
}
