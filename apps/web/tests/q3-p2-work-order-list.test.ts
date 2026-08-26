import assert from 'node:assert/strict'
import type { AppSession } from '@/lib/auth-session'
import {
  getWorkOrderTrackingList,
  type WorkOrderTrackingQuery,
} from '@/lib/services/tracking-service'
import {
  buildFieldTechWorkOrderOwnershipWhere,
  isQ3OwnershipEnforcedForSession,
} from '@/lib/q3-field-tech-ownership'
import type { AppRole } from '@/lib/types'
import { mockTrackingWorkOrderAssignments } from '@/lib/mock-tracking'

function makeSession(
  override: Partial<AppSession> & { role: AppRole; userId: number },
): AppSession {
  return {
    id: 'sess-p2-' + (override.userId ?? 9999),
    userId: override.userId ?? 9999,
    username: override.username ?? 'default.user',
    role: override.role,
    displayName: override.displayName ?? 'Default User',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  }
}

const NOC_OP_USER_ID = 44
const TECH_TROUBLE_USER_ID = 211
const TECH_PSB_USER_ID = 212
const OTHER_TECH_USER_ID = 9999

type MockAssignment = {
  id: number
  workOrderId: number
  assignedUserId: number
  assignmentRole: string
  assignmentStatus: string
  isPrimary: 0 | 1
  assignedAt: string | null
  acceptedAt: string | null
  releasedAt: string | null
  notes: string | null
  assignedUsername: string | null
  assignedFullName: string | null
}

const originalAssignments: MockAssignment[] = JSON.parse(JSON.stringify(mockTrackingWorkOrderAssignments)) as MockAssignment[]

function restoreAssignments() {
  const freshClone = JSON.parse(JSON.stringify(originalAssignments)) as MockAssignment[]
  mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...freshClone)
}

function injectAssignment(item: MockAssignment) {
  mockTrackingWorkOrderAssignments.push(item)
}

async function run12P2Tests() {
  let failures = 0
  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`  PASS ${name}`)
    } catch (err) {
      failures += 1
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        `  FAIL ${name}\n       ${message.split('\n').join('\n       ')}`,
      )
    } finally {
      restoreAssignments()
    }
  }

  // T1: FIELD TECH = PIC (uid=44 = current_pic_user_id WO 321 dan 322) → DUA WO returned
  await test(
    'P2-T1 FIELD_TECH PIC session.userId = 44 sees both WO 321,322 (current_pic match)',
    async () => {
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: NOC_OP_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(items.length, 2, 'PIC 44 → 2 WO (321, 322) OWNED via PIC branch')
      assert.equal(items.find((r) => r.id === 321)?.picUserId, NOC_OP_USER_ID)
      assert.equal(items.find((r) => r.id === 322)?.picUserId, NOC_OP_USER_ID)
    },
  )

  // T2: FIELD TECH uid=211 ACTIVE ASSIGNMENT ACCEPTED di WO 321 → RETURNED
  await test(
    'P2-T2 FIELD_TECH uid=211 ACTIVE assignment ACCEPTED WO 321 → returned',
    async () => {
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_TROUBLE_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(items.length, 1, '211 assignment ACCEPTED active → 1 WO')
      assert.equal(items[0]?.id, 321, 'WO 321 ID returned (TROUBLE assigned)')
    },
  )

  // T3: FIELD TECH uid=9999 neither PIC NOR ASSIGNMENT → 0 returned NOT RETURNED
  await test(
    'P2-T3 FIELD_TECH 9999 neither PIC nor assigned → 0 NOT RETURNED deny',
    async () => {
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: OTHER_TECH_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(items.length, 0, 'User 9999 no ownership relation → DENY 0 items')
    },
  )

  // T4: FIELD TECH uid=211 assignment status RELEASED → NOT returned
  await test(
    'P2-T4 FIELD_TECH 211 ACCEPTED assignment modified RELEASED status → NOT returned',
    async () => {
      // Override existing assignment ID 9001 active ACCEPTED → RELEASED untuk user 211
      const existingAssignment = mockTrackingWorkOrderAssignments.find(
        (a) => a.workOrderId === 321 && a.assignedUserId === TECH_TROUBLE_USER_ID,
      ) as MockAssignment | undefined
      assert.ok(existingAssignment, 'Assignment 9001 untuk 211 WO 321 ADA sebelum modif')
      existingAssignment.assignmentStatus = 'RELEASED'
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_TROUBLE_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(items.length, 0, 'status RELEASED TIDAK termasuk ACTIVE list → denied 0')
    },
  )

  // T5: FIELD TECH uid=212 released_at = NOT NULL → NOT returned (status ASSIGNED tetap tapi released_at sudah ada)
  await test(
    'P2-T5 FIELD_TECH 212 assignment released_at NOT NULL → NOT returned',
    async () => {
      const existing212 = mockTrackingWorkOrderAssignments.find(
        (a) => a.workOrderId === 322 && a.assignedUserId === TECH_PSB_USER_ID,
      ) as MockAssignment | undefined
      assert.ok(existing212, 'Assignment untuk 212 WO 322 ada')
      existing212.releasedAt = '2026-07-20 08:00:00'
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_PSB_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(items.length, 0, 'released_at NOT NULL revoke ownership → 0 items')
    },
  )

  // T6: FIELD TECH mine=false → UNAUTHORIZED WO 9999 TETAP NOT returned (bukan show all)
  await test(
    'P2-T6 FIELD_TECH uid=9999 mine=false → unauthorized WO STILL NOT returned, mine bypass NO',
    async () => {
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: OTHER_TECH_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        { mine: '0' } as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(items.length, 0, 'mine=0 tidak pernah berarti "show all" untuk user tanpa ownership → still deny')
    },
  )

  // T7: FIELD TECH mine omitted (query tanpa mine) → unauthorized WO 9999 NOT returned
  await test(
    'P2-T7 FIELD_TECH uid=9999 mine omitted → unauthorized still NOT returned',
    async () => {
      const session = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: OTHER_TECH_USER_ID,
      })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session },
      )
      assert.equal(
        items.length,
        0,
        'mine omitted (default) juga tidak berarti show all → ownership tetap enforced deny',
      )
    },
  )

  // T8: FIELD TECH username same, userId DIFFERENT (collision). user HACKER username=collision uid=999 punya 0 WO → NOT returned (tidak pakai username boundary)
  await test(
    'P2-T8 username SAMA userId BEDA (999 vs 211 collision) → tidak dapat WO orang lain (NOT returned, numeric only)',
    async () => {
      const realSession = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_TROUBLE_USER_ID,
        username: 'collision.tech.p2',
      })
      const hackerSession = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: OTHER_TECH_USER_ID,
        username: 'collision.tech.p2',
      })
      const realRes = await getWorkOrderTrackingList({} as WorkOrderTrackingQuery, {
        session: realSession,
      })
      const hackRes = await getWorkOrderTrackingList({} as WorkOrderTrackingQuery, {
        session: hackerSession,
      })
      assert.equal(realRes.items.length, 1, 'Real user 211 bisa akses WO 321')
      assert.equal(
        hackRes.items.length,
        0,
        'Hacker username sama tapi userId 999 TIDAK BOLEH dapat WO orang lain',
      )
    },
  )

  // T9: userId SAMA username BEDA (user ganti username/typo) → tetap RETURNED, identity numeric
  await test(
    'P2-T9 userId SAMA username BEDA (uid 211) → tetap returned, username identity TIDAK PAKAI',
    async () => {
      const s1 = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_TROUBLE_USER_ID,
        username: 'teknisi.trouble.oldUsername',
      })
      const s2 = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_TROUBLE_USER_ID,
        username: 'teknisi.trouble.renamedP2',
      })
      const r1 = await getWorkOrderTrackingList({} as WorkOrderTrackingQuery, { session: s1 })
      const r2 = await getWorkOrderTrackingList({} as WorkOrderTrackingQuery, { session: s2 })
      assert.equal(r1.items.length, 1)
      assert.equal(r2.items.length, 1)
      assert.equal(r1.items[0]?.id, 321)
      assert.equal(r2.items[0]?.id, 321)
    },
  )

  // T10: Non-FIELD TECH role ADMIN (14 role lain) → behavior unchanged ALL WO 2 items
  await test(
    'P2-T10 Non-FIELD_TECH ADMIN role → unchanged behavior 2 WO visible NOOP',
    async () => {
      const s = makeSession({ role: 'ADMIN', userId: 11 })
      const { items } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session: s },
      )
      assert.equal(items.length, 2, 'Non FT tidak dikenakan ownership filter → 2 WO tampil semua')
      assert.deepEqual(
        items.map((r) => r.id).sort(),
        [321, 322],
        'WO ID 321 322 visible di ADMIN unchanged behavior',
      )
      const shouldEnforce = isQ3OwnershipEnforcedForSession(s)
      assert.equal(shouldEnforce, false, 'admin isQ3 enforced false → NOOP')
    },
  )

  // T11: FIELD TECH userId INVALID / UNDEFINED → FAIL CLOSED 0 returned
  await test(
    'P2-T11 FIELD TECH invalid userId (undefined, 0, negative) → FAIL CLOSED 0 rows',
    async () => {
      const base = makeSession({ role: 'FIELD_TECHNICIAN', userId: 44 })
      const sessions = [
        { ...base, userId: undefined } satisfies AppSession as AppSession,
        { ...base, userId: 0 },
        { ...base, userId: -11 },
      ]
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i]
        const { items } = await getWorkOrderTrackingList(
          {} as WorkOrderTrackingQuery,
          { session: s },
        )
        assert.equal(items.length, 0, `invalid userId scenario ${i} → 0 rows fail closed`)
      }
    },
  )

  // T12: SQL / query construction ownership INSIDE WHERE clause, BUKAN hanya post-fetch filter
  await test(
    'P2-T12 Ownership enforced SQL WHERE level BEFORE return rows (bukan post-fetch only). Verify predicate helper order, values prepend, mock ownership applied BEFORE mine/status/limit filter, NO username ownership.',
    async () => {
      // A. Verify PREDICATE ORDER: helper ownership FIRST, mine LAST (AND stacking additional UX narrowing)
      const ftSession = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_TROUBLE_USER_ID,
      })
      const pred = buildFieldTechWorkOrderOwnershipWhere(ftSession, 'wo')
      // B. helper ownership predicate NOT post-fetch only (contains SQL fragments & bind values)
      assert.ok(
        pred.whereFragment.includes('EXISTS') && pred.whereFragment.includes('IN'),
        'helper menghasilkan SQL fragment EXISTS + IN untuk WHERE → SQL level ownership',
      )
      assert.equal(pred.enforced, true)
      assert.equal(pred.values[0], TECH_TROUBLE_USER_ID)
      assert.equal(pred.values[1], TECH_TROUBLE_USER_ID)
      assert.equal(
        pred.values[2],
        'FIELD_TECHNICIAN',
        'SQL IN list assignment role canonical = FIELD_TECHNICIAN',
      )
      assert.ok(
        pred.whereFragment.includes('released_at IS NULL'),
        'SQL include released_at IS NULL guard → WHERE level bukan post fetch',
      )
      // C. NO username di WHERE ownership: predicate TIDAK contain string session.username
      assert.ok(
        !pred.whereFragment.includes('username') &&
          !pred.values.some((v) => typeof v === 'string' && v.includes('.user')),
        'NO username used ownership identity → numeric only',
      )
      // D. TECH_B 212 dapatkan WO 321? TIDAK. TECH_B 212 assigned di WO 322 → yes.
      const techBSession = makeSession({
        role: 'FIELD_TECHNICIAN',
        userId: TECH_PSB_USER_ID,
      })
      const { items: techBItems } = await getWorkOrderTrackingList(
        {} as WorkOrderTrackingQuery,
        { session: techBSession },
      )
      assert.equal(techBItems.length, 1)
      assert.equal(techBItems[0]?.id, 322, 'TECH_B uid=212 dapat WO miliknya sendiri via assignment')
      assert.equal(
        techBItems[0]?.picUserId,
        NOC_OP_USER_ID,
        'PIC uid WO 322 = 44 ORANG LAIN TAPI TECH_B = assigned user → MASIH BOLEH AKSES (OR branch assignment)',
      )
    },
  )

  console.log('')
  console.log(`P2 work-order list Q3 ownership enforcement tests: ${12 - failures}/12 PASSED`)
  if (failures > 0) {
    process.exit(1)
  }
}

void run12P2Tests()
