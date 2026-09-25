import { runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch02aEmployeeCodeUnique, ensureHrBatch01Schema } from '../hr-batch02a-schema-ensure'

export type ResolvedEmployeeIdentity = {
  id: number
  full_name: string
  employee_code: string
  user_id: number
  is_active: number
}

export class EmployeeIdentityNotLinkedError extends Error {
  status = 403
  constructor() {
    super('Employee identity not linked for authenticated user. Please contact HR.')
    this.name = 'EmployeeIdentityNotLinkedError'
  }
}

export async function resolveEmployeeByAuthUserId(
  authUserId: number | null | undefined,
): Promise<ResolvedEmployeeIdentity | null> {
  if (authUserId === null || authUserId === undefined) return null
  const safeUserId = Number(authUserId)
  if (!Number.isFinite(safeUserId) || !Number.isInteger(safeUserId) || safeUserId <= 0) return null
  try {
    await ensureHrBatch01Schema()
    await ensureHrBatch02aEmployeeCodeUnique()
  } catch {
    // ignore ensure failures during identity resolve; DB query still attempted below
  }
  const rows = await runReviewDbQuery<ResolvedEmployeeIdentity>(
    `SELECT id, full_name, employee_code, user_id, is_active FROM hr_employees WHERE user_id = ? LIMIT 1`,
    [safeUserId],
  )
  const row = rows[0] ?? null
  if (!row) return null
  return {
    id: Number(row.id),
    full_name: String(row.full_name ?? ''),
    employee_code: String(row.employee_code ?? ''),
    user_id: Number(row.user_id),
    is_active: Number(row.is_active ?? 1) === 0 ? 0 : 1,
  }
}

export async function requireEmployeeByAuthUserId(
  authUserId: number | null | undefined,
): Promise<ResolvedEmployeeIdentity> {
  const identity = await resolveEmployeeByAuthUserId(authUserId)
  if (!identity) throw new EmployeeIdentityNotLinkedError()
  if (identity.is_active === 0) {
    const err = new EmployeeIdentityNotLinkedError()
    err.message = 'Employee status tidak aktif. Silakan hubungi HR.'
    throw err
  }
  return identity
}
