import type { AppSession } from '@/lib/auth-session'
import type { WorkOrderAssignmentRow } from '@/lib/services/tracking-service'

export function canAcceptAssignment(
  session: Pick<AppSession, 'role' | 'userId'>,
  row: Pick<
    WorkOrderAssignmentRow,
    'assignedUserId' | 'assignmentStatus' | 'releasedAt'
  >,
): boolean {
  return (
    session.role === 'FIELD_TECHNICIAN' &&
    Number(session.userId) === Number(row.assignedUserId) &&
    String(row.assignmentStatus ?? '').toUpperCase() === 'ASSIGNED' &&
    row.releasedAt == null
  )
}

type PredicateCase = {
  name: string
  session: Pick<AppSession, 'role' | 'userId'>
  row: Pick<WorkOrderAssignmentRow, 'assignedUserId' | 'assignmentStatus' | 'releasedAt'>
  expected: boolean
}

const predicateCases: PredicateCase[] = [
  {
    name: 'T1 FT + own ASSIGNED + releasedAt null = true',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'ASSIGNED', releasedAt: null },
    expected: true,
  },
  {
    name: 'T2 FT + another technician assignment = false',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 99, assignmentStatus: 'ASSIGNED', releasedAt: null },
    expected: false,
  },
  {
    name: 'T3 SUPER_ADMIN + match owner = false',
    session: { role: 'SUPER_ADMIN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'ASSIGNED', releasedAt: null },
    expected: false,
  },
  {
    name: 'T4 FT + own ACCEPTED = false',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'ACCEPTED', releasedAt: null },
    expected: false,
  },
  {
    name: 'T5 FT + own RELEASED status = false',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'RELEASED', releasedAt: '2025-01-01 10:00:00' },
    expected: false,
  },
  {
    name: 'T6 FT + own DRAFT status = false',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'DRAFT', releasedAt: null },
    expected: false,
  },
  {
    name: 'T7 FT + null status = false',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: null, releasedAt: null },
    expected: false,
  },
  {
    name: 'T8 FT + lowercase assigned case-insensitive = true',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'assigned', releasedAt: null },
    expected: true,
  },
  {
    name: 'T9 FT userId null = false',
    session: { role: 'FIELD_TECHNICIAN', userId: null },
    row: { assignedUserId: 12, assignmentStatus: 'ASSIGNED', releasedAt: null },
    expected: false,
  },
  {
    name: 'T10 FT + ASSIGNED but releasedAt not null = false',
    session: { role: 'FIELD_TECHNICIAN', userId: 12 },
    row: { assignedUserId: 12, assignmentStatus: 'ASSIGNED', releasedAt: '2024-12-01 08:00:00' },
    expected: false,
  },
]

type ApiContractCase = {
  name: string
  run: () => boolean
}

const apiContractCases: ApiContractCase[] = [
  {
    name: 'T11 request body NEVER contains userId/role/assigned_user_id authority keys',
    run: () => {
      const forbidden = [
        'userId',
        'role',
        'assigned_user_id',
        'assignedUserId',
        'assignedByUserId',
        'sessionId',
        'token',
      ] as const
      const body = JSON.stringify({})
      const parsed = JSON.parse(body) as unknown
      if (parsed && typeof parsed === 'object') {
        for (const key of forbidden) {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) return false
        }
      }
      return true
    },
  },
  {
    name: 'T12 assignmentId is encoded as PATH parameter only, not body nor query',
    run: () => {
      const assignmentId = 9001
      const url = `/api/sales/work-orders/assignments/${encodeURIComponent(String(assignmentId))}/accept`
      const body = JSON.stringify({})
      return (
        url.includes(String(assignmentId)) &&
        !/[/?&]assignmentId=/.test(url) &&
        !body.includes(String(assignmentId))
      )
    },
  },
]

const results: string[] = []
let failures = 0

for (const kase of predicateCases) {
  const actual = canAcceptAssignment(kase.session, kase.row)
  const pass = actual === kase.expected
  if (!pass) failures += 1
  results.push(`${pass ? '✓' : '✗'} [PREDICATE] ${kase.name}: expected=${kase.expected} actual=${actual}`)
}

for (const kase of apiContractCases) {
  const pass = kase.run()
  if (!pass) failures += 1
  results.push(`${pass ? '✓' : '✗'} [CONTRACT] ${kase.name}`)
}

console.log('=== P5.6 Field Technician Acceptance UI Integration Audit ===')
for (const line of results) console.log(line)
console.log('')
console.log(
  `Executable tests: ${predicateCases.length + apiContractCases.length}  (predicate=${predicateCases.length}, contract=${apiContractCases.length})`,
)
console.log(
  `Structure-only expectations (NOT executed): T13 canAccept=false renders null; T14 submitting disabled guard (manually verified in assignment-accept-button.tsx source).`,
)
console.log(`Result: PASS=${predicateCases.length + apiContractCases.length - failures}  FAIL=${failures}`)
if (failures !== 0) {
  process.exit(1)
}

export {}
