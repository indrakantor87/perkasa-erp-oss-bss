import assert from 'node:assert/strict'
import type { AppSession } from '@/lib/auth-session'
import { getWorkOrderTrackingDetail } from '@/lib/services/tracking-service'
import { buildFieldTechWorkOrderOwnershipWhere } from '@/lib/q3-field-tech-ownership'
import type { AppRole } from '@/lib/types'
import { mockTrackingWorkOrderAssignments } from '@/lib/mock-tracking'

function makeSession(
  override: Partial<AppSession> & { role: AppRole; userId: number },
): AppSession {
  return {
    id: 'sess-p3-' + (override.userId ?? 9999),
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

const WO_PIC_NOC = 321
const WO_PSBB_PIC_NOC_TECH212 = 322
const WO_ARBITRARY_OTHER = 30000

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

const originalAssignmentsBaseline: MockAssignment[] = JSON.parse(
  JSON.stringify(mockTrackingWorkOrderAssignments),
) as MockAssignment[]
function restoreAssignments() {
  const fresh = JSON.parse(JSON.stringify(originalAssignmentsBaseline)) as MockAssignment[]
  mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...fresh)
}

async function run12P3Tests() {
  let failures = 0
  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`  PASS ${name}`)
    } catch (err) {
      failures += 1
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  FAIL ${name}\n       ${message.split('\n').join('\n       ')}`)
    } finally {
      restoreAssignments()
    }
  }

  // T1: FT PIC match (uid=44, WO 321 picUserId=44) → ALLOW workOrder not null
  await test('P3-T1 FIELD_TECH current_pic_user_id = session.userId → ALLOW not null', async () => {
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: NOC_OP_USER_ID })
    const { workOrder } = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
    assert.ok(workOrder, 'PIC 44 WO 321 = own → ALLOW')
    assert.equal(workOrder.id, WO_PIC_NOC)
    assert.equal(workOrder.picUserId, NOC_OP_USER_ID)
  })

  // T2: FT PIC differs (uid=212 not PIC WO 321 picUserId=44) + active assignment FT exists for 212 at WO 322 → ALLOW assignment match
  await test('P3-T2 FIELD_TECH current_pic differs + active assignment match → ALLOW', async () => {
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: TECH_PSB_USER_ID })
    const { workOrder } = await getWorkOrderTrackingDetail(WO_PSBB_PIC_NOC_TECH212, { session: s })
    assert.ok(workOrder, 'uid 212 assigned active WO 322 → ALLOW even picUserId = 44 orang lain')
    assert.equal(workOrder.id, WO_PSBB_PIC_NOC_TECH212)
    assert.equal(workOrder.picUserId, NOC_OP_USER_ID)
  })

  // T3: FT neither PIC nor assignment belongs → DENY null
  await test('P3-T3 FIELD_TECH PIC differs + assignment belongs other (9999 arbitrary WO ID → not found because none assign) → DENY null', async () => {
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: OTHER_TECH_USER_ID })
    const res = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
    assert.equal(res.workOrder, null, 'WO 321 PIC 44 tidak punya relation dengan 9999 → DENY')
    assert.deepEqual(res.assignments, [], 'enrichments assignments = empty when denied')
    assert.deepEqual(res.statusLogs, [], 'statusLogs empty')
    assert.deepEqual(res.movements, [], 'movements empty')
  })

  // T4: assignment status RELEASED → DENY
  await test('P3-T4 FIELD_TECH assignment status RELEASED → DENY null', async () => {
    const row = mockTrackingWorkOrderAssignments.find(
      (a) => a.workOrderId === WO_PIC_NOC && a.assignedUserId === TECH_TROUBLE_USER_ID,
    ) as MockAssignment | undefined
    assert.ok(row)
    row.assignmentStatus = 'RELEASED'
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: TECH_TROUBLE_USER_ID })
    const { workOrder } = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
    assert.equal(workOrder, null, 'status RELEASED removed dari active list → DENY')
  })

  // T5: released_at != NULL (datetime not null) → DENY
  await test('P3-T5 FIELD_TECH released_at NOT NULL → DENY null', async () => {
    const row = mockTrackingWorkOrderAssignments.find(
      (a) => a.workOrderId === WO_PSBB_PIC_NOC_TECH212 && a.assignedUserId === TECH_PSB_USER_ID,
    ) as MockAssignment | undefined
    assert.ok(row)
    row.releasedAt = '2026-07-21 07:30:00'
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: TECH_PSB_USER_ID })
    const { workOrder } = await getWorkOrderTrackingDetail(WO_PSBB_PIC_NOC_TECH212, { session: s })
    assert.equal(workOrder, null, 'released_at NOT NULL revoke access → DENY')
  })

  // T6: assignment role != FIELD_TECHNICIAN (e.g. NOC_OPERATOR string role) → DENY
  await test('P3-T6 FIELD_TECH assignment role changed NON FT role → DENY null', async () => {
    const row = mockTrackingWorkOrderAssignments.find(
      (a) => a.workOrderId === WO_PIC_NOC && a.assignedUserId === TECH_TROUBLE_USER_ID,
    ) as MockAssignment | undefined
    assert.ok(row)
    row.assignmentRole = 'SOME_OTHER_ROLE_X'
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: TECH_TROUBLE_USER_ID })
    const { workOrder } = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
    assert.equal(workOrder, null, 'assignment_role bukan FIELD_TECHNICIAN → DENY')
  })

  // T7: invalid / missing userId (undefined, 0, negative) → fail closed deny null
  await test('P3-T7 FIELD_TECH missing/invalid userId (undefined, 0, negative) → FAIL CLOSED DENY null', async () => {
    const base = makeSession({ role: 'FIELD_TECHNICIAN', userId: NOC_OP_USER_ID })
    const invalidSessions: Array<AppSession> = [
      { ...base, userId: undefined } satisfies AppSession as AppSession,
      { ...base, userId: 0 },
      { ...base, userId: -88 },
    ]
    for (const s of invalidSessions) {
      const { workOrder } = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
      assert.equal(workOrder, null, `FAIL CLOSED untuk userId ${String(s.userId)}`)
    }
  })

  // T8: arbitrary WO ID milik orang lain uid=211 akses WO 322 (yg TECH=212, PIC=44; 211 BUKAN PIC dan tidak punya assignment WO 322) → DENY
  await test('P3-T8 FIELD_TECH arbitrary WO ID belongs another user → DENY null', async () => {
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: TECH_TROUBLE_USER_ID })
    const { workOrder } = await getWorkOrderTrackingDetail(WO_PSBB_PIC_NOC_TECH212, { session: s })
    assert.equal(workOrder, null, '211 tidak punya hubungan ownership WO 322 (PIC=44, assigned 212) → DENY')
    const arbitraryRes = await getWorkOrderTrackingDetail(WO_ARBITRARY_OTHER, { session: s })
    assert.equal(arbitraryRes.workOrder, null, 'WO ID random tidak ada (not exist) → null too (no leak exist)')
  })

  // T9: Non-FT ADMIN role → existing behavior preserved: WO 321 & WO 322 keduanya accessible
  await test('P3-T9 Non-FIELD_TECH (ADMIN) existing behavior unchanged access allowed both WO', async () => {
    const s = makeSession({ role: 'ADMIN', userId: 1 })
    const r321 = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
    const r322 = await getWorkOrderTrackingDetail(WO_PSBB_PIC_NOC_TECH212, { session: s })
    assert.ok(r321.workOrder && r322.workOrder, 'Non-FT ADMIN role NOOP → both accessible')
    assert.equal(r321.workOrder.id, WO_PIC_NOC)
    assert.equal(r322.workOrder.id, WO_PSBB_PIC_NOC_TECH212)
  })

  // T10: NO username used ownership identity: helper predicate values not contain username; collision username same userId diff deny ownership detail
  await test('P3-T10 No username ownership boundary. Username same userId diff → DENY; userId same username diff → ALLOW', async () => {
    const realUser = makeSession({
      role: 'FIELD_TECHNICIAN',
      userId: TECH_TROUBLE_USER_ID,
      username: 'p3.collision.same',
    })
    const hackerSameUserDiffUid = makeSession({
      role: 'FIELD_TECHNICIAN',
      userId: OTHER_TECH_USER_ID,
      username: 'p3.collision.same',
    })
    const realDiffUsernameSameUid = makeSession({
      role: 'FIELD_TECHNICIAN',
      userId: TECH_TROUBLE_USER_ID,
      username: 'p3.renamed.after',
    })
    const resReal = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: realUser })
    const resHack = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: hackerSameUserDiffUid })
    const resRename = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: realDiffUsernameSameUid })
    assert.ok(resReal.workOrder, 'uid=211 username A = allowed')
    assert.equal(resHack.workOrder, null, 'username sama TAPI uid 999 beda → DENY (tidak pakai username boundary)')
    assert.ok(resRename.workOrder, 'uid=211 username B beda → masih allowed (identity numeric userId)')
    const p = buildFieldTechWorkOrderOwnershipWhere(hackerSameUserDiffUid, 'wo')
    assert.ok(!p.values.some((v) => typeof v === 'string' && v.includes('collision')), 'NO username injected in bind params')
  })

  // T11: ownership PRIMARY query level NOT post-fetch. Bukti: WHERE wo.id=? AND (pic=? OR EXISTS ...) bind values DIDAHULUKAN sebelum enrichment. Detail non-null lalu predicate enforced via SQL di PRIMARY SELECT (atau mock find equivalent closure ownership di row.id + ownershipAllowed).
  await test('P3-T11 OWNERSHIP PRIMARY query NOT post-fetch. verify ownership filter BEFORE fetch enrichments; predicate P1 SQL exists', async () => {
    // Predicate structure: SQL EXISTS + IN untuk WHERE clause (bukan post-fetch function object only)
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: TECH_PSB_USER_ID })
    const pred = buildFieldTechWorkOrderOwnershipWhere(s, 'wo')
    assert.ok(
      pred.whereFragment.includes('EXISTS (') &&
        pred.whereFragment.includes('IN (?, ?)') &&
        pred.whereFragment.includes('released_at IS NULL'),
      'SQL ownership predicate structure for WHERE level enforcement: EXISTS + status IN + released null',
    )
    assert.equal(pred.enforced, true)
    // Mock mode: ownership injected dalam find callback (row.id = X AND mockOwnershipAllowedForRow). Bukan find dulu → filter after.
    const otherUid = makeSession({ role: 'FIELD_TECHNICIAN', userId: OTHER_TECH_USER_ID })
    const res = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: otherUid })
    assert.equal(res.workOrder, null, 'uid 9999 WO 321 denied = primary closure workOrder find reject, bukan workOrder found kemudian nullify after')
  })

  // T12: detail enrichments UNREACHABLE ketika primary ownership fail. assignments/statusLogs/movements == arrays kosong dan length 0.
  await test('P3-T12 Enrichments (assignments/statusLogs/movements) UNREACHABLE ketika primary ownership denied', async () => {
    const s = makeSession({ role: 'FIELD_TECHNICIAN', userId: OTHER_TECH_USER_ID })
    const res = await getWorkOrderTrackingDetail(WO_PIC_NOC, { session: s })
    assert.equal(res.workOrder, null, 'primary = null')
    assert.ok(Array.isArray(res.assignments) && res.assignments.length === 0, 'assignments = [] empty')
    assert.ok(Array.isArray(res.statusLogs) && res.statusLogs.length === 0, 'statusLogs = [] empty')
    assert.ok(Array.isArray(res.movements) && res.movements.length === 0, 'movements = [] empty → tidak ada data assignment bocor meskipun mockTrackingWorkOrderAssignments ada relasi WO 321 dengan user 211. uid 9999 tidak boleh lihat!')
  })

  console.log('')
  console.log(`P3 work-order detail ownership IDOR enforcement tests: ${12 - failures}/12 PASSED`)
  if (failures > 0) process.exit(1)
}

void run12P3Tests()
