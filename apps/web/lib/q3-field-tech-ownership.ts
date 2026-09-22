import type { AppSession } from '@/lib/auth-session'

export type Q3OwnershipPredicateResult = {
  whereFragment: string
  values: unknown[]
  enforced: boolean
  enforcementMode: 'FIELD_TECH_ENFORCED' | 'OTHER_ROLE_NOOP' | 'FIELD_TECH_FAIL_CLOSED_INVALID_USERID'
  tableAlias: string
  assignmentRole: string
  activeStatuses: string[]
}

export const Q3_ASSIGNMENT_ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED'] as const

export const Q3_ASSIGNMENT_ROLE_CANONICAL = 'FIELD_TECHNICIAN'

const POSITIVE_INTEGER = /^[1-9]\d*$/

function isValidUserId(candidate: unknown): candidate is number {
  if (typeof candidate === 'number') {
    return Number.isFinite(candidate) && candidate > 0 && Number.isInteger(candidate)
  }
  if (typeof candidate === 'string') {
    return POSITIVE_INTEGER.test(candidate.trim())
  }
  return false
}

export function buildFieldTechWorkOrderOwnershipWhere(
  session: AppSession,
  alias: string = 'wo',
): Q3OwnershipPredicateResult {
  const sanitizedAlias = String(alias ?? 'wo').trim() || 'wo'

  if (!session || session.role !== 'FIELD_TECHNICIAN') {
    return {
      whereFragment: '',
      values: [],
      enforced: false,
      enforcementMode: 'OTHER_ROLE_NOOP',
      tableAlias: sanitizedAlias,
      assignmentRole: Q3_ASSIGNMENT_ROLE_CANONICAL,
      activeStatuses: [...Q3_ASSIGNMENT_ACTIVE_STATUSES],
    }
  }

  if (!isValidUserId(session.userId)) {
    return {
      whereFragment: '1 = 0',
      values: [],
      enforced: true,
      enforcementMode: 'FIELD_TECH_FAIL_CLOSED_INVALID_USERID',
      tableAlias: sanitizedAlias,
      assignmentRole: Q3_ASSIGNMENT_ROLE_CANONICAL,
      activeStatuses: [...Q3_ASSIGNMENT_ACTIVE_STATUSES],
    }
  }

  const numericUserId = Number(session.userId)
  const woRef = sanitizedAlias

  const values: unknown[] = []

  values.push(numericUserId)
  values.push(Q3_ASSIGNMENT_ROLE_CANONICAL)
  for (const status of Q3_ASSIGNMENT_ACTIVE_STATUSES) {
    values.push(status)
  }
  values.push(numericUserId)
  const statusPlaceholders = Q3_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')

  const whereFragment = [
    '(',
    '  (EXISTS (',
    '    SELECT 1',
    '    FROM service_work_order_assignments q3_a',
    `    WHERE q3_a.work_order_id = ${woRef}.id`,
    '      AND q3_a.assigned_user_id = ?',
    '      AND q3_a.assignment_role = ?',
    `      AND q3_a.assignment_status IN (${statusPlaceholders})`,
    '      AND q3_a.released_at IS NULL',
    '  ))',
    '  OR (',
    `    ${woRef}.current_pic_user_id = ?`,
    '    AND NOT EXISTS (',
    '      SELECT 1',
    '      FROM service_work_order_assignments q3_a_other',
    `      WHERE q3_a_other.work_order_id = ${woRef}.id`,
    `        AND q3_a_other.assigned_user_id <> ${woRef}.current_pic_user_id`,
    '        AND q3_a_other.released_at IS NULL',
    '    )',
    '  )',
    ')',
  ].join('\n')

  return {
    whereFragment,
    values,
    enforced: true,
    enforcementMode: 'FIELD_TECH_ENFORCED',
    tableAlias: sanitizedAlias,
    assignmentRole: Q3_ASSIGNMENT_ROLE_CANONICAL,
    activeStatuses: [...Q3_ASSIGNMENT_ACTIVE_STATUSES],
  }
}

export function isQ3OwnershipEnforcedForSession(session: AppSession | null | undefined): boolean {
  if (!session) return false
  if (session.role !== 'FIELD_TECHNICIAN') return false
  return true
}
