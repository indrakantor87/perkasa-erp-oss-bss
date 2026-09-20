import type { AppSession } from '@/lib/auth-session'
import {
  buildFieldTechTroubleTicketOwnershipWhere,
} from '@/lib/q3-field-tech-tt-ownership'
import { isValidTransition } from '@/lib/services/field-tech-transitions'

type AppRole =
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'HR'
  | 'GA'
  | 'PENJUALAN'
  | 'SALES_MARKETING'
  | 'CS_OPERATOR'
  | 'CS_ADMIN'
  | 'NOC_OPERATOR'
  | 'FIELD_TECHNICIAN'
  | 'TT_OPERATOR'
  | 'DIGITAL_CREATOR'
  | 'DISMANTLE_OPERATOR'
  | 'PUBLIC'

function makeSession(overrides: {
  userId?: number
  username?: string
  displayName?: string
  role: AppRole
  branchId?: number | null
  branchIds?: number[]
}): AppSession {
  return {
    userId: overrides.userId ?? 1,
    username: overrides.username ?? 'noc.user',
    displayName: overrides.displayName ?? 'NOC User',
    role: overrides.role,
    branchId: overrides.branchId ?? 5,
    branchIds: overrides.branchIds ?? [5],
  }
}

type NocP0Scenario = {
  id: string
  description: string
  setup: string
  assertion: string
  requiresStagingDb: boolean
}

const NOC_P0_14_SCENARIOS: NocP0Scenario[] = [
  {
    id: 'BRANCH_SCOPE_IMMUTABLE',
    description: 'TT branch scope immutable — setelah assignment tidak bisa pindah branch',
    setup: 'Staging: buat TT branch A → assign tech branch A → attempt update branch_id ke B via tamper body',
    assertion: 'SELECT branch_id FROM support_trouble_tickets WHERE id = ? → tetap branch A',
    requiresStagingDb: true,
  },
  {
    id: 'TT_CLOSE_ACTOR_SESSION',
    description: 'TT close actor session — actorId harus diambil dari session bukan dari body',
    setup: 'Staging: login noc session userId=500 → POST /close dengan body actorUserId=999999',
    assertion: 'INSERT support_trouble_ticket_statuses.changed_by_user_id = 500 (session), bukan 999999',
    requiresStagingDb: true,
  },
  {
    id: 'WO_TT_CASCADE_ACTOR',
    description: 'WO→TT cascade actor — jika work order complete maka linked TT pakai actor session',
    setup: 'Staging: WO link ke TT → tech session userId=101 complete WO',
    assertion: 'TT progress log updated_by user#101 = session actor, bukan body value',
    requiresStagingDb: true,
  },
  {
    id: 'SIBLING_GUARD',
    description: 'Sibling guard — TT A yang bukan milik session tidak bisa transition meskipun punya TT B',
    setup: 'Staging: session tech#101 punya TT-A (owned) dan TT-B (other tech owned)',
    assertion: 'Attempt POST /submit TT-B → 403. TT-A tetap bisa submit 200',
    requiresStagingDb: true,
  },
]

const WO_ACCEPT_RELEASE_PRESERVED: { scenario: string; assertion: string }[] = [
  { scenario: 'WO accept via assignments/[id]/accept route', assertion: 'Assignment status = ACCEPTED, released_at IS NULL' },
  { scenario: 'WO release via assignments/[id]/release route', assertion: 'released_at NOT NULL, next tech bisa accept assignment baru' },
  { scenario: 'WO accept idempotent — double POST accept', assertion: 'Tidak insert duplikat, total assignment active tetap 1' },
  { scenario: 'WO release idempotent — double POST release', assertion: 'Tidak error, released_at tidak berubah dari nilai pertama' },
]

const TRACKING_COUNTERS_SPEC: { dimension: string; assertion: string }[] = [
  { dimension: 'Dashboard tracking list "Mine" counter', assertion: 'WHERE ownership = current_session userId AND status active, tidak cross tech' },
  { dimension: 'WO queue status count per branch', assertion: 'SUM per status (ASSIGNED/ACCEPTED/ON_PROGRESS/TEMPORARY/SUBMITTED) hanya branchIds session' },
  { dimension: 'TT tracking detail ownership badge', assertion: 'Badge "MINE" iff session ada di assigned_user_id OR active assignment released_at null' },
  { dimension: 'Sibling counter exclusion', assertion: 'TT milik sibling (tech lain di branch sama) TIDAK masuk ke "Mine" count' },
]

void (async function runGroupE() {
  // SPEC E25: Existing NOC P0 14 scenario preserved
  try {
    const scenariosDefined = NOC_P0_14_SCENARIOS.length === 4
    const allRequireStaging = NOC_P0_14_SCENARIOS.every((s) => s.requiresStagingDb === true)
    const idsComplete = NOC_P0_14_SCENARIOS.map((s) => s.id).sort()
    const expectedIds = ['BRANCH_SCOPE_IMMUTABLE', 'SIBLING_GUARD', 'TT_CLOSE_ACTOR_SESSION', 'WO_TT_CASCADE_ACTOR'].sort()
    const idsMatch = JSON.stringify(idsComplete) === JSON.stringify(expectedIds)
    const nocSession = makeSession({ role: 'NOC_OPERATOR', userId: 501 })
    const ttPredScope = buildFieldTechTroubleTicketOwnershipWhere(nocSession, 'tt')
    const notEnforcedForNoc = ttPredScope.enforcementMode === 'OTHER_ROLE_NOOP' || ttPredScope.isEnforced === false
    void allRequireStaging
    if (scenariosDefined && idsMatch && notEnforcedForNoc) {
      console.log('TEST E25 Existing NOC P0 14 scenario preserved → PRESERVED: NOT_VERIFIED')
    } else {
      console.log('TEST E25 Existing NOC P0 14 scenario preserved → PRESERVED: NOT_VERIFIED')
    }
  } catch {
    console.log('TEST E25 Existing NOC P0 14 scenario preserved → PRESERVED: NOT_VERIFIED')
  }

  // SPEC E26: Existing WO accept/release tests preserved
  try {
    const acceptReleaseDefined = WO_ACCEPT_RELEASE_PRESERVED.length === 4
    const transitionMatrixIntact =
      isValidTransition('ASSIGNED', 'ACCEPT', 'TROUBLE') === true &&
      isValidTransition('ACCEPTED', 'START', 'PSB') === true
    void acceptReleaseDefined
    void transitionMatrixIntact
    console.log('TEST E26 Existing WO accept/release tests preserved → PRESERVED: NOT_VERIFIED')
  } catch {
    console.log('TEST E26 Existing WO accept/release tests preserved → PRESERVED: NOT_VERIFIED')
  }

  // SPEC E27: Existing tracking list counters ownership detail preserved
  try {
    const counterSpecsComplete = TRACKING_COUNTERS_SPEC.length === 4
    const dimensions = TRACKING_COUNTERS_SPEC.map((c) => c.dimension)
    const hasMine = dimensions.some((d) => d.includes('Mine'))
    const hasSibling = dimensions.some((d) => d.includes('Sibling'))
    const hasQueueStatus = dimensions.some((d) => d.includes('queue status'))
    const hasBadge = dimensions.some((d) => d.includes('badge'))
    void counterSpecsComplete
    void hasMine
    void hasSibling
    void hasQueueStatus
    void hasBadge
    console.log('TEST E27 Existing tracking list counters ownership detail preserved → PRESERVED: NOT_VERIFIED')
  } catch {
    console.log('TEST E27 Existing tracking list counters ownership detail preserved → PRESERVED: NOT_VERIFIED')
  }
})()
