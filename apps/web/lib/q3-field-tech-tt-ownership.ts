import type { AppSession } from '@/lib/auth-session'

export type Q3TTOwnershipPredicateResult = {
  sqlFragment: string
  bindParams: unknown[]
  isEnforced: boolean
  enforcementMode: 'FIELD_TECH_ENFORCED' | 'OTHER_ROLE_NOOP' | 'FIELD_TECH_FAIL_CLOSED_INVALID_USERID'
  ttAlias: string
  assignmentRole: string
  activeStatuses: string[]
}

const Q3_TT_ASSIGNMENT_ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED'] as const

const Q3_TT_ASSIGNMENT_ROLE_CANONICAL = 'FIELD_TECHNICIAN'

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

export function buildFieldTechTroubleTicketOwnershipWhere(
  session: AppSession,
  ttAlias: string = 'tt',
): Q3TTOwnershipPredicateResult {
  const sanitizedAlias = String(ttAlias ?? 'tt').trim() || 'tt'

  if (!session || session.role !== 'FIELD_TECHNICIAN') {
    return {
      sqlFragment: '',
      bindParams: [],
      isEnforced: false,
      enforcementMode: 'OTHER_ROLE_NOOP',
      ttAlias: sanitizedAlias,
      assignmentRole: Q3_TT_ASSIGNMENT_ROLE_CANONICAL,
      activeStatuses: [...Q3_TT_ASSIGNMENT_ACTIVE_STATUSES],
    }
  }

  if (!isValidUserId(session.userId)) {
    return {
      sqlFragment: '1 = 0',
      bindParams: [],
      isEnforced: true,
      enforcementMode: 'FIELD_TECH_FAIL_CLOSED_INVALID_USERID',
      ttAlias: sanitizedAlias,
      assignmentRole: Q3_TT_ASSIGNMENT_ROLE_CANONICAL,
      activeStatuses: [...Q3_TT_ASSIGNMENT_ACTIVE_STATUSES],
    }
  }

  const numericUserId = Number(session.userId)
  const ttRef = sanitizedAlias

  const bindParams: unknown[] = []

  bindParams.push(numericUserId)
  bindParams.push(Q3_TT_ASSIGNMENT_ROLE_CANONICAL)
  for (const status of Q3_TT_ASSIGNMENT_ACTIVE_STATUSES) {
    bindParams.push(status)
  }
  bindParams.push(numericUserId)
  const statusPlaceholders = Q3_TT_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')

  const sqlFragment = [
    '(',
    '  (EXISTS (',
    '    SELECT 1',
    '    FROM service_trouble_ticket_assignments q3_tta',
    `    WHERE q3_tta.trouble_ticket_id = ${ttRef}.id`,
    '      AND q3_tta.assigned_user_id = ?',
    '      AND q3_tta.assignment_role = ?',
    `      AND q3_tta.assignment_status IN (${statusPlaceholders})`,
    '      AND q3_tta.released_at IS NULL',
    '  ))',
    '  OR (',
    `    ${ttRef}.assigned_user_id = ?`,
    '    AND NOT EXISTS (',
    '      SELECT 1',
    '      FROM service_trouble_ticket_assignments q3_tta_other',
    `      WHERE q3_tta_other.trouble_ticket_id = ${ttRef}.id`,
    `        AND q3_tta_other.assigned_user_id <> ${ttRef}.assigned_user_id`,
    '        AND q3_tta_other.released_at IS NULL',
    '    )',
    '  )',
    ')',
  ].join('\n')

  return {
    sqlFragment,
    bindParams,
    isEnforced: true,
    enforcementMode: 'FIELD_TECH_ENFORCED',
    ttAlias: sanitizedAlias,
    assignmentRole: Q3_TT_ASSIGNMENT_ROLE_CANONICAL,
    activeStatuses: [...Q3_TT_ASSIGNMENT_ACTIVE_STATUSES],
  }
}

export function isQ3OwnershipEnforcedForSessionTT(
  session: AppSession | null | undefined,
): boolean {
  if (!session) return false
  if (session.role !== 'FIELD_TECHNICIAN') return false
  return true
}
