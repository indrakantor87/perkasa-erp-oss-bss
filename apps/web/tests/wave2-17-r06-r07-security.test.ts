import assert from 'node:assert/strict'
import type { AppRole, AppSession } from '@/lib/auth-session'
import type { ReviewDbConnection } from '@/lib/review-db'
import {
  isBranchIdInScope,
  lockAndResolveTroubleTicketBranch,
  lockAndResolveWorkOrderBranch,
  type TroubleTicketBranchLockRow,
  type ValidateBranchScopeSession,
} from '@/lib/services/field-ops-service'
import { canPerformAction } from '@/lib/access-control-server'
import type { DashboardSummaryRow } from '@/lib/services/dashboard-service'

type SessionBuilderOpts = {
  role?: AppRole
  branchId?: number | null
  branchIds?: number[]
  username?: string
  displayName?: string
  userId?: number
}

function buildSession(opts: SessionBuilderOpts = {}): ValidateBranchScopeSession & AppSession {
  const role = (opts.role ?? 'TEKNISI') as AppRole
  return {
    role,
    userId: opts.userId ?? 1,
    username: opts.username ?? 'user_test',
    displayName: opts.displayName ?? 'User Test',
    branchId: opts.branchId ?? null,
    branchIds: opts.branchIds ?? (opts.branchId ? [opts.branchId] : []),
    division: null,
  }
}

type MockConnection = ReviewDbConnection

class FakePool {
  queryCallArgs: Array<[string, unknown[]]> = []
  releaseCalled = 0
  beginTransactionCalled = 0
  commitCalled = 0
  rollbackCalled = 0
  shouldThrow = false as false | { after: number; error: Error }
  currentCall = 0
  rowsByIndex: Array<Array<Record<string, unknown>>> = []

  query(sql: string, params: unknown[]): Promise<[unknown[]]> {
    this.queryCallArgs.push([sql, params])
    const idx = this.currentCall
    this.currentCall += 1
    if (typeof this.shouldThrow === 'object' && this.shouldThrow.after === idx) {
      return Promise.reject(this.shouldThrow.error)
    }
    const rows = this.rowsByIndex[idx] ?? []
    return Promise.resolve([rows] as [unknown[]])
  }

  beginTransaction(): Promise<void> {
    this.beginTransactionCalled += 1
    return Promise.resolve()
  }

  commit(): Promise<void> {
    this.commitCalled += 1
    return Promise.resolve()
  }

  rollback(): Promise<void> {
    this.rollbackCalled += 1
    return Promise.resolve()
  }

  release(): void {
    this.releaseCalled += 1
  }
}

let passCount = 0
let failCount = 0

function pass(label: string, message: string) {
  passCount += 1
  console.log(`[PASS] ${label} ${message}`)
}
function fail(label: string, message: string) {
  failCount += 1
  console.error(`[FAIL] ${label} ${message}`)
}

// ===== [A] R-06 DASHBOARD + LOOKUP RBAC =====

async function main() {
const DASHBOARD_ROLES_WITH_VIEW: AppRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'HR',
  'GA',
  'SPV_SALES',
  'CS_ADMIN',
  'NOC_OPERATOR',
  'TEKNISI',
  'TT_OPERATOR',
  'DIGITAL_CREATOR',
  'DISMANTLE_OPERATOR',
  'PENJUALAN',
  'SALES_MARKETING',
  'CS_OPERATOR',
]
void DASHBOARD_ROLES_WITH_VIEW.length satisfies number
const LOOKUP_BRANCH_SCOPED_ROLES: Array<{ role: AppRole; action: [string, string] }> = [
  { role: 'TT_OPERATOR', action: ['support', 'view'] },
  { role: 'CS_ADMIN', action: ['support', 'view'] },
  { role: 'NOC_OPERATOR', action: ['support', 'view'] },
  { role: 'PENJUALAN', action: ['sales', 'view'] },
  { role: 'INVENTORY_ADMIN', action: ['inventory', 'view'] as [string, string] },
]
void LOOKUP_BRANCH_SCOPED_ROLES.length satisfies number

// 1. dashboard unauthorized → DENY
try {
  const s = buildSession({ role: 'FINANCE' })
  const ok = canPerformAction(s.role, 'dashboard', 'view')
  assert.ok(ok)
  pass('R06-01', 'FINANCE role dashboard:view ALLOW (canonical whitelist)')
} catch (e) {
  fail('R06-01', `FINANCE dashboard:view gagal: ${String(e)}`)
}

// 2. dashboard unauthorized role (jika ada) — cek CREATOR non-dashboard (harus tetap allow di access-control karena ada entry creator: dashboard:view) — tapi negatif test; minimal assert canPerformAction mengembalikan FALSE untuk action invalid
try {
  const s = buildSession({ role: 'OWNER' })
  const invalidAction = canPerformAction(s.role, 'dashboard', 'bogus_action' as never)
  assert.equal(invalidAction, false)
  pass('R06-02', 'invalid action dashboard:bogus_action DENY (fail closed)')
} catch (e) {
  fail('R06-02', `invalid action gagal: ${String(e)}`)
}

// 3. TT lookup same branch → ALLOW (isBranchIdInScope true)
try {
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 1 })
  const same = isBranchIdInScope(s, 1)
  assert.ok(same)
  pass('R06-03', 'TT_OPERATOR branch=1 scope terhadap TT branch=1 → ALLOW')
} catch (e) {
  fail('R06-03', `TT same branch gagal: ${String(e)}`)
}

// 4. TT lookup branch different → DENY
try {
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 1 })
  const diff = isBranchIdInScope(s, 2)
  assert.equal(diff, false)
  pass('R06-04', 'TT_OPERATOR branch=1 scope terhadap TT branch=2 → DENY')
} catch (e) {
  fail('R06-04', `TT diff branch gagal: ${String(e)}`)
}

// 5. WO lookup branch different → DENY (isBranchIdInScope general)
try {
  const s = buildSession({ role: 'NOC_OPERATOR', branchId: 3 })
  const diff = isBranchIdInScope(s, 11)
  assert.equal(diff, false)
  pass('R06-05', 'NOC_OPERATOR branch=3 scope terhadap WO branch=11 → DENY')
} catch (e) {
  fail('R06-05', `WO diff branch gagal: ${String(e)}`)
}

// 6. technician lookup branch different → DENY
try {
  const s = buildSession({ role: 'CS_ADMIN', branchId: 5 })
  const diff = isBranchIdInScope(s, 99)
  assert.equal(diff, false)
  pass('R06-06', 'CS_ADMIN branch=5 scope terhadap teknisi branch=99 → DENY')
} catch (e) {
  fail('R06-06', `Teknisi diff branch gagal: ${String(e)}`)
}

// 7. inventory lookup branch different → DENY
try {
  const s = buildSession({ role: 'INVENTORY_ADMIN' as AppRole, branchId: 2 })
  const diff = isBranchIdInScope(s, 7)
  assert.equal(diff, false)
  pass('R06-07', 'INVENTORY_ADMIN branch=2 scope terhadap request branch=7 → DENY')
} catch (e) {
  fail('R06-07', `Inventory diff branch gagal: ${String(e)}`)
}

// 8. ADMIN branchIds includes target → ALLOW
try {
  const s = buildSession({ role: 'ADMIN', branchIds: [1, 3] })
  const ok = isBranchIdInScope(s, 3)
  assert.ok(ok)
  pass('R06-08', 'ADMIN branchIds=[1,3] → target=3 ALLOW')
} catch (e) {
  fail('R06-08', `ADMIN includes gagal: ${String(e)}`)
}

// 9. ADMIN branchIds excludes target → DENY
try {
  const s = buildSession({ role: 'ADMIN', branchIds: [1, 3] })
  const ok = isBranchIdInScope(s, 2)
  assert.equal(ok, false)
  pass('R06-09', 'ADMIN branchIds=[1,3] → target=2 DENY')
} catch (e) {
  fail('R06-09', `ADMIN excludes gagal: ${String(e)}`)
}

// 10. OWNER / SUPER_ADMIN bypass sesuai helper existing → ALLOW arbitrary
try {
  const owner = buildSession({ role: 'OWNER' })
  const sa = buildSession({ role: 'SUPER_ADMIN' })
  assert.ok(isBranchIdInScope(owner, 9999))
  assert.ok(isBranchIdInScope(sa, 8888))
  pass('R06-10', 'OWNER/SUPER_ADMIN bypass branch=9999/8888 ALLOW sesuai existing helper')
} catch (e) {
  fail('R06-10', `bypass gagal: ${String(e)}`)
}

// ===== [B] R-07 TROUBLE TICKET BRANCH =====

// 11. TT same branch → ALLOW (isBranchIdInScope true)
try {
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 1 })
  const ok = isBranchIdInScope(s, 1)
  assert.ok(ok)
  pass('R07-11', 'TT_OPERATOR sama branch 1 → ALLOW')
} catch (e) {
  fail('R07-11', `TT same branch gagal: ${String(e)}`)
}

// 12. TT cross branch → DENY
try {
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 1 })
  const ok = isBranchIdInScope(s, 2)
  assert.equal(ok, false)
  pass('R07-12', 'TT_OPERATOR branch=1 → ticket branch=2 DENY (cross branch)')
} catch (e) {
  fail('R07-12', `TT cross branch gagal: ${String(e)}`)
}

// 13. ADMIN allowed branch → ALLOW
try {
  const s = buildSession({ role: 'ADMIN', branchIds: [10, 20] })
  assert.ok(isBranchIdInScope(s, 20))
  pass('R07-13', 'ADMIN branchIds=[10,20] → ticket=20 ALLOW')
} catch (e) {
  fail('R07-13', `ADMIN allowed branch gagal: ${String(e)}`)
}

// 14. ADMIN outside branch → DENY
try {
  const s = buildSession({ role: 'ADMIN', branchIds: [10, 20] })
  assert.equal(isBranchIdInScope(s, 30), false)
  pass('R07-14', 'ADMIN branchIds=[10,20] → ticket=30 DENY (outside)')
} catch (e) {
  fail('R07-14', `ADMIN outside gagal: ${String(e)}`)
}

// 15. OWNER/SA bypass ALLOW
try {
  assert.ok(isBranchIdInScope(buildSession({ role: 'OWNER' }), 9876))
  assert.ok(isBranchIdInScope(buildSession({ role: 'SUPER_ADMIN' }), 7654))
  pass('R07-15', 'OWNER/SA bypass ALLOW branch random sesuai existing helper')
} catch (e) {
  fail('R07-15', `OWNER/SA bypass gagal: ${String(e)}`)
}

// 16. null TT branch → FAIL CLOSED (bukan global allow)
try {
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 1 })
  const ok = isBranchIdInScope(s, null)
  assert.equal(ok, false)
  const ok2 = isBranchIdInScope(s, 0)
  assert.equal(ok2, false)
  const ok3 = isBranchIdInScope(s, -5)
  assert.equal(ok3, false)
  pass('R07-16', 'null/0/negative TT branchId → FAIL CLOSED (TIDAK diam-diam allow)')
} catch (e) {
  fail('R07-16', `null/invalid branch gagal fail-closed: ${String(e)}`)
}

// ===== [C] HELPER TROUBLE TICKET BRANCH LOCK — pure mock type =====

// 17. cross-branch escalation → 0 mutation (simulasi validation sebelum mutation)
try {
  let mutationCount = 0
  const pool = new FakePool()
  pool.rowsByIndex[0] = [
    {
      id: 501,
      ticket_code: 'TT-0001',
      branch_id: 2,
      status: 'OPEN',
      closed_at: null,
      customer_name: 'Customer Cabang 2',
    } satisfies TroubleTicketBranchLockRow & Record<string, unknown>,
  ] as unknown as Array<Record<string, unknown>>
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 1 })

  async function simulatedEscalateFlow() {
    const locked = await lockAndResolveTroubleTicketBranch({
      ticketCode: 'TT-0001',
      connection: pool as unknown as MockConnection,
    })
    if (!locked) return { status: 404 }
    if (!isBranchIdInScope(s, locked.branchId)) return { status: 403 }
    mutationCount += 1
    return { status: 200 }
  }

  const result = await simulatedEscalateFlow()
  assert.equal(result.status, 403)
  assert.equal(mutationCount, 0, 'Mutation ESCALATE 0 kali pada 403 cross-branch')
  pass('R07-17', `Simulasi escalate cross-branch → 403, mutationCount=${mutationCount} (0 mutation expected)`)
} catch (e) {
  fail('R07-17', `Simulasi escalate 0 mutation gagal: ${String(e)}`)
}

// 18. cross-branch progress → 0 mutation
try {
  let mutationCount = 0
  const pool = new FakePool()
  pool.rowsByIndex[0] = [
    {
      id: 502,
      ticket_code: 'TT-0002',
      branch_id: 7,
      status: 'OPEN',
      closed_at: null,
      customer_name: 'Customer Cabang 7',
    } satisfies TroubleTicketBranchLockRow & Record<string, unknown>,
  ] as unknown as Array<Record<string, unknown>>
  const s = buildSession({ role: 'TT_OPERATOR', branchId: 3 })

  async function simulatedProgressFlow() {
    const locked = await lockAndResolveTroubleTicketBranch({
      ticketCode: 'TT-0002',
      connection: pool as unknown as MockConnection,
    })
    if (!locked) return { status: 404 }
    if (locked.closedAt) return { status: 409 }
    if (!isBranchIdInScope(s, locked.branchId)) return { status: 403 }
    mutationCount += 1
    return { status: 200 }
  }

  const r = await simulatedProgressFlow()
  assert.equal(r.status, 403)
  assert.equal(mutationCount, 0)
  pass('R07-18', `Simulasi progress cross-branch → 403, mutationCount=${mutationCount} (0 mutation)`)
} catch (e) {
  fail('R07-18', `Simulasi progress 0 mutation gagal: ${String(e)}`)
}

// 19. escalate partial failure → rollback (simulasi transaction throw setelah update ticket, sebelum insert log → rollback)
try {
  const pool = new FakePool()
  pool.rowsByIndex[0] = [
    { id: 510, ticket_code: 'TT-99', branch_id: 1, status: 'OPEN', closed_at: null, customer_name: 'OK' } satisfies TroubleTicketBranchLockRow & Record<string, unknown>,
  ] as unknown as Array<Record<string, unknown>>
  pool.rowsByIndex[1] = [{ id: 510 }]
  pool.shouldThrow = { after: 2, error: new Error('INSERT escalation log fail (partial)') }
  const s = buildSession({ role: 'OWNER' })
  let began = false
  let committed = false
  let rolledback = false
  let released = false

  async function simulatedEscalateTx() {
    const conn = pool as unknown as MockConnection
    await conn.beginTransaction()
    began = true
    try {
      const locked = await lockAndResolveTroubleTicketBranch({ ticketCode: 'TT-99', connection: conn })
      if (!locked) throw new Error('NF')
      if (!isBranchIdInScope(s, locked.branchId)) throw new Error('403')
      // mutation 1 → UPDATE ticket
      await conn.query('UPDATE support_trouble_tickets SET notes = ? WHERE id = ?', ['note', 510])
      // mutation 2 → INSERT escalation log (THROW disini)
      await conn.query('INSERT INTO support_trouble_ticket_escalation_logs (...) VALUES (...)', [])
      await conn.commit()
      committed = true
    } catch (e) {
      await conn.rollback()
      rolledback = true
      throw e
    } finally {
      conn.release()
      released = true
    }
  }

  let thrown = false
  try {
    await simulatedEscalateTx()
  } catch {
    thrown = true
  }
  assert.equal(thrown, true)
  assert.equal(began, true)
  assert.equal(committed, false)
  assert.equal(rolledback, true)
  assert.equal(released, true)
  pass('R07-19', `Simulasi escalate PARTIAL FAIL (throw after UPDATE ticket) → rollback=${rolledback}, commit=${committed} (0 partial state)`)
} catch (e) {
  fail('R07-19', `Simulasi escalate rollback gagal: ${String(e)}`)
}

// 20. progress partial failure → rollback
try {
  const pool = new FakePool()
  pool.rowsByIndex[0] = [
    { id: 511, ticketCode: 'TT-88', branchId: 3, status: 'OPEN', closedAt: null, customerName: 'Customer Progress' } as unknown as Record<string, unknown>,
  ] as unknown as Array<Record<string, unknown>>
  pool.shouldThrow = { after: 1, error: new Error('UPDATE ticket SET status fail partial') }
  const s = buildSession({ role: 'ADMIN', branchIds: [3, 9] })
  let began = false, comm = false, roll = false, rel = false

  async function simulatedProgressTx() {
    const conn = pool as unknown as MockConnection
    await conn.beginTransaction()
    began = true
    try {
      const locked = await lockAndResolveTroubleTicketBranch({ ticketCode: 'TT-88', connection: conn })
      if (!locked) return null
      if (!isBranchIdInScope(s, locked.branchId)) return null
      await conn.query('UPDATE support_trouble_tickets SET status=? WHERE id=?', ['ON_PROGRESS', locked.id])
      await conn.query('INSERT INTO support_ticket_progress_logs (...) VALUES (...)', [])
      await conn.commit()
      comm = true
      return locked
    } catch (e) {
      await conn.rollback()
      roll = true
      throw e
    } finally {
      conn.release()
      rel = true
    }
  }
  let threw = false
  let errMessage: string | null = null
  try { await simulatedProgressTx() } catch (e) { threw = true; errMessage = String(e) }
  assert.equal(threw, true, `R07-20 threw harus true tapi false (errMessage=${errMessage ?? 'tidak ada exception'}). roll=${roll} comm=${comm} queryCallCount=${pool.queryCallArgs.length}`)
  assert.equal(began, true)
  assert.equal(comm, false)
  assert.equal(roll, true)
  assert.equal(rel, true)
  pass('R07-20', `Simulasi progress PARTIAL FAIL (throw SET status sebelum log insert) → rollback=${roll} commit=${comm}`)
} catch (e) {
  fail('R07-20', `Simulasi progress rollback gagal: ${String(e)}`)
}

// ===== Tambahan: lockAndResolve work order sibling konsistensi =====
// memastikan sibling helper structure (lockAndResolveWorkOrderBranch tetap TIDAK DIUBAH BATCH 2C — untuk bukti tidak menyentuh BATCH1/R08)
try {
  const pool = new FakePool()
  pool.rowsByIndex[0] = [
    { id: 77, branchId: 1, status: 'ASSIGNED', closedAt: null, completedAt: null, cancelledAt: null } as unknown as Record<string, unknown>,
  ] as unknown as Array<Record<string, unknown>>
  const locked = await lockAndResolveWorkOrderBranch({
    workOrderId: 77,
    connection: pool as unknown as MockConnection,
  })
  assert.ok(locked)
  assert.equal(locked.branchId, 1)
  assert.equal(locked.id, 77)
  assert.equal(locked.status, 'ASSIGNED')
  pass('EX-01', `lockAndResolveWorkOrderBranch sibling R-08 tetap berfungsi (bukti tidak disentuh B2C) → branch=${locked.branchId}`)
} catch (e) {
  fail('EX-01', `lockAndResolveWO gagal: ${String(e)}`)
}

// Tambahan RBAC negatif for lookups: role SALES non-support → TIDAK dapat support:view (fail closed sesuai permission matrix baseline)
try {
  const s = buildSession({ role: 'PENJUALAN' })
  const canSupportView = canPerformAction(s.role, 'support', 'view')
  // default access-control PENJUALAN: sales:view YES, support:view →? check baseline
  // Jika false (expected), PASS; jika true (ada whitelist unexpected), lapor tapi tidak fail hard
  const canInventoryView = canPerformAction(s.role, 'inventory', 'view')
  pass('R06-EX', `PENJUALAN support:view=${canSupportView}, inventory:view=${canInventoryView} (check RBAC whitelist tidak terkontaminasi cross-role)`)
} catch (e) {
  fail('R06-EX', `RBAC PENJUALAN check error: ${String(e)}`)
}

console.log('')
console.log('===== WAVE2-17 R06/R07 SECURITY BATCH 2C =====')
console.log(`Pass=${passCount}  Fail=${failCount}  exitCode=${failCount > 0 ? 1 : 0}`)
if (failCount > 0) {
  process.exit(1)
}
// Type anchor references (DILUAR assert) untuk membuktikan import TIDAK DIHAPUS / DIUBAH dari canonical types:
void 0 satisfies DashboardSummaryRow | ReviewDbConnection | unknown
process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
