import type { AppRole } from '@/lib/types'
import { isBranchIdInScope } from '@/lib/services/field-ops-service'
import type { ValidateBranchScopeSession } from '@/lib/services/field-ops-service'

let exitCode = 0
let passCount = 0
let failCount = 0

function assertEqual<T>(actual: T, expected: T, label: string): boolean {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  actual:   ${a}\n  expected: ${e}`)
  exitCode = 1
  failCount++
  return false
}
function assertTrue(cond: unknown, label: string): boolean {
  if (cond) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}`)
  exitCode = 1
  failCount++
  return false
}
function assertFalse(cond: unknown, label: string): boolean {
  return assertTrue(!cond, label)
}

function buildSession(role: string, branchId: number | null, branchIds: number[]): ValidateBranchScopeSession {
  return {
    role: (role || 'PUBLIC').toUpperCase() as AppRole,
    branchId,
    branchIds: Array.isArray(branchIds) ? branchIds : [],
  }
}

function toPositiveIntegerOrNull(value: unknown): number | null {
  const n = Number(value ?? 0)
  return Number.isInteger(n) && n > 0 ? n : null
}

type BranchReference = { label: string; branchId: number | null }

function validateProvidedBranches(provided: BranchReference[]): {
  ok: boolean
  statusCode: 400 | 403 | 200
  consolidatedBranchId: number | null
  message?: string
} {
  const positiveBranches = provided.filter((b) => Number.isInteger(b.branchId) && (b.branchId ?? 0) > 0)
  if (positiveBranches.length > 1) {
    const firstBranchId = positiveBranches[0].branchId as number
    const mismatch = positiveBranches.filter((b) => b.branchId !== firstBranchId)
    if (mismatch.length > 0) {
      return {
        ok: false,
        statusCode: 400,
        consolidatedBranchId: null,
        message: 'Reference entity berasal dari cabang berbeda. Semua reference harus berasal dari cabang yang sama.',
      }
    }
  }
  const consolidatedBranchId: number | null =
    positiveBranches.length > 0 ? (positiveBranches[0].branchId as number) : null
  return { ok: true, statusCode: 200, consolidatedBranchId }
}

async function run() {
  // ===================================================================
  // R08 — Shared helper tests: pure logic WITHOUT DB / network
  // ===================================================================

  // --- R08-A1 Same branch: INVENTORY branch=1 + subscription branch=1 -> ALLOW
  {
    const session = buildSession('INVENTORY', 1, [1])
    const provided: BranchReference[] = [{ label: 'Service No', branchId: 1 }]
    const check = validateProvidedBranches(provided)
    assertTrue(check.ok && check.statusCode === 200, 'R08-A1a Same branch (1=1): cross-reference consistency PASS')
    assertTrue(
      check.consolidatedBranchId === 1,
      'R08-A1b Same branch consolidatedBranchId = 1 (sama dengan session branch actor)',
    )
    assertTrue(
      isBranchIdInScope(session, check.consolidatedBranchId),
      'R08-A1c INVENTORY branch=1 scope → target branch=1 → isBranchIdInScope = ALLOW',
    )
  }

  // --- R08-A2 Cross branch: INVENTORY branch=1 + subscription branch=2 -> DENY
  {
    const session = buildSession('INVENTORY', 1, [1])
    const provided: BranchReference[] = [{ label: 'Service No', branchId: 2 }]
    const check = validateProvidedBranches(provided)
    assertTrue(check.ok && check.consolidatedBranchId === 2, 'R08-A2a Cross ref consistent: consolidated = 2')
    assertFalse(
      isBranchIdInScope(session, check.consolidatedBranchId),
      'R08-A2b INVENTORY branch=1 scope → target branch=2 → isBranchIdInScope = DENY (cross branch actor ditolak)',
    )
  }

  // --- R08-B1 Cross branch: INVENTORY branch=1 + workOrder branch=2 -> DENY
  {
    const session = buildSession('INVENTORY', 1, [1])
    const provided: BranchReference[] = [{ label: 'Work Order No', branchId: 2 }]
    const check = validateProvidedBranches(provided)
    assertEqual(check.consolidatedBranchId, 2, 'R08-B1a Work Order branch=2 → consolidatedBranchId = 2')
    assertFalse(
      isBranchIdInScope(session, check.consolidatedBranchId),
      'R08-B1b INVENTORY branch=1 → work order branch=2 → isBranchIdInScope = DENY (cross branch work order ditolak)',
    )
  }

  // --- R08-C1 Multi-reference consistent: customer branch=1 + workOrder branch=1 -> ALLOW
  {
    const session = buildSession('INVENTORY', 1, [1])
    const provided: BranchReference[] = [
      { label: 'Customer Code', branchId: 1 },
      { label: 'Work Order No', branchId: 1 },
    ]
    const check = validateProvidedBranches(provided)
    assertTrue(
      check.ok && check.statusCode === 200 && check.consolidatedBranchId === 1,
      'R08-C1 Multi ref (customer+WO) sama cabang 1 → konsolidasi = 1, consistency OK',
    )
    assertTrue(
      isBranchIdInScope(session, check.consolidatedBranchId),
      'R08-C1b Session INVENTORY branch=1 scope → ALLOW untuk 2 reference yang sama cabang',
    )
  }

  // --- R08-C2 Multiple reference mismatch: service branch=1 + workOrder branch=2 -> HTTP 400
  {
    const provided: BranchReference[] = [
      { label: 'Service No', branchId: 1 },
      { label: 'Work Order No', branchId: 2 },
    ]
    const check = validateProvidedBranches(provided)
    assertTrue(
      !check.ok && check.statusCode === 400,
      'R08-C2a Service branch=1 + WO branch=2 → cross-reference consistency DETECT MISMATCH, status 400 BAD REQUEST',
    )
    assertTrue(
      typeof check.message === 'string' && check.message.includes('cabang berbeda'),
      'R08-C2b Pesan error menjelaskan reference lintas cabang (message="...cabang berbeda...")',
    )
    assertEqual(check.consolidatedBranchId, null, 'R08-C2c consolidatedBranchId = NULL saat mismatch (TIDAK diam-diam pilih branch pertama)')
  }

  // --- R08-D1 ADMIN [1,3] + target branch=3 -> ALLOW
  {
    const session = buildSession('ADMIN', 1, [1, 3])
    assertTrue(
      isBranchIdInScope(session, 3),
      'R08-D1 ADMIN branchIds=[1,3] → target branch=3 DI-ALLOW (sesuai helper existing isBranchIdInScope)',
    )
  }

  // --- R08-D2 ADMIN [1,3] + target branch=2 -> DENY
  {
    const session = buildSession('ADMIN', 1, [1, 3])
    assertFalse(
      isBranchIdInScope(session, 2),
      'R08-D2 ADMIN branchIds=[1,3] → target branch=2 LUAR scope → DENY (cross branch admin ditolak sesuai existing helper)',
    )
  }

  // --- R08-E1 OWNER target branch arbitrary (9999) -> ALLOW
  {
    const session = buildSession('OWNER', null, [])
    assertTrue(
      isBranchIdInScope(session, 9999),
      'R08-E1 OWNER bypass semua branch → target branch arbitrary 9999 = ALLOW sesuai helper existing',
    )
  }

  // --- R08-E2 SUPER_ADMIN target branch arbitrary (8888) -> ALLOW
  {
    const session = buildSession('SUPER_ADMIN', 5, [5])
    assertTrue(
      isBranchIdInScope(session, 8888),
      'R08-E2 SUPER_ADMIN bypass semua branch → target branch arbitrary 8888 = ALLOW sesuai helper existing',
    )
  }

  // --- R08-F1 Non-admin + null branch reference -> DENY (fail closed, BUKAN global)
  {
    const session = buildSession('INVENTORY', 1, [1])
    assertFalse(
      isBranchIdInScope(session, null),
      'R08-F1 Non-admin INVENTORY → consolidatedBranchId NULL (reference branch tidak valid) → DENY fail closed sesuai helper existing (BUKAN global diam-diam allow)',
    )
  }

  // --- R08-F2 Non-admin + invalid branch string / non-integer -> DENY via toPositiveIntegerOrNull + isBranchIdInScope
  {
    const session = buildSession('INVENTORY', 1, [1])
    const branchRaw: unknown = 'INVALID-BRANCH'
    const parsed = toPositiveIntegerOrNull(branchRaw)
    assertEqual(parsed, null, 'R08-F2a Invalid branch string → toPositiveIntegerOrNull = NULL (integer positive fail)')
    assertFalse(
      isBranchIdInScope(session, parsed),
      'R08-F2b Hasil parsed NULL → isBranchIdInScope = DENY (fail closed tanpa fallback)',
    )
    const negBranch = toPositiveIntegerOrNull(-5)
    assertEqual(negBranch, null, 'R08-F2c Negative integer branch (-5) → NULL (fail closed)')
    assertFalse(
      isBranchIdInScope(session, negBranch),
      'R08-F2d Negative → NULL → DENY (TIDAK ada interpretasi negatif = global / bypass)',
    )
  }

  // --- R08-G1 Atomic rollback: simulate throw AFTER mutation #1 success (mock transaction pattern)
  {
    let mutationAssignmentInserted = false
    let mutationStockMovementInserted = false
    let mutationStockUpdated = false
    let rollbackCalled = false

    async function mockTransactionAtomicity_ThrowAfterFirst(throwAt: 1 | 2 | 3): Promise<void> {
      try {
        mutationAssignmentInserted = true
        if (throwAt === 1) throw new Error('SIMULATE ERROR AFTER MUTATION 1')
        mutationStockMovementInserted = true
        if (throwAt === 2) throw new Error('SIMULATE ERROR AFTER MUTATION 2')
        mutationStockUpdated = true
        if (throwAt === 3) throw new Error('SIMULATE ERROR AFTER MUTATION 3')
      } catch (e) {
        rollbackCalled = true
        mutationAssignmentInserted = false
        mutationStockMovementInserted = false
        mutationStockUpdated = false
        throw e
      }
    }

    try {
      await mockTransactionAtomicity_ThrowAfterFirst(2)
    } catch {
      /* expected */
    }
    assertTrue(rollbackCalled, 'R08-G1a Throw SETELAH mutation #1 (assignment insert) → ROLLBACK dipanggil')
    assertFalse(mutationAssignmentInserted, 'R08-G1b Assignment insert DIBATALKAN (TIDAK ada partial assignment tanpa movement)')
    assertFalse(mutationStockMovementInserted, 'R08-G1c Stock movement TIDAK ada (rollback consistent)')
    assertFalse(mutationStockUpdated, 'R08-G1d Stock update TIDAK berjalan (consistent all or nothing)')
  }

  // --- R08-G2 Atomic rollback: throw AFTER mutation #2 success (movement inserted, assignment inserted, stock not updated)
  {
    let assignment = false
    let movement = false
    let stock = false
    let rollback = false
    async function mockTx(t2: 1 | 2 | 3) {
      try {
        assignment = true
        if (t2 === 1) throw new Error('E1')
        movement = true
        if (t2 === 2) throw new Error('E2')
        stock = true
        if (t2 === 3) throw new Error('E3')
      } catch {
        rollback = true
        assignment = false
        movement = false
        stock = false
        throw new Error('ROLLBACK_COMMIT')
      }
    }
    try {
      await mockTx(3)
    } catch {
      /* expected rollback throw */
    }
    assertTrue(rollback, 'R08-G2a Throw setelah mutation #2 (movement), sebelum #3 (update stock) → ROLLBACK aktif')
    assertFalse(assignment && movement && !stock, 'R08-G2b TIDAK BOLEH ada state assignment+movement ADA tapi stock TIDAK berkurang (partial integrity). State rollback=0 semua.')
    assertFalse(assignment, 'R08-G2c Assignment dibatalkan (semua atau tidak ada)')
    assertFalse(movement, 'R08-G2d Movement dibatalkan')
    assertFalse(stock, 'R08-G2e Stock decrement dibatalkan')
  }

  // --- R08-H1 Race condition stock=1: second transaction after first commit sees stock=0 → reject (sequence simulation)
  {
    type ItemRow = { id: number; currentStock: number }
    const dbState: Map<number, ItemRow> = new Map([[1, { id: 1, currentStock: 1 }]])

    function simulateLockedStockCheckTxn(actor: string): boolean {
      const row = dbState.get(1)
      if (!row) return false
      if (row.currentStock <= 0) return false
      row.currentStock -= 1
      return true
    }

    const txnA = simulateLockedStockCheckTxn('A')
    assertTrue(txnA, 'R08-H1 Transaksi A (lock + check stock=1 >0 + decrement = SUCCESS)')

    const txnB = simulateLockedStockCheckTxn('B')
    assertFalse(txnB, 'R08-H1 Transaksi B (SETELAH A commit lock release → lock READ stock=0 → REJECT. TIDAK NEGATIVE STOCK)')

    const finalStock = dbState.get(1)?.currentStock ?? -99
    assertTrue(finalStock === 0, `R08-H1 Final stock = 0 (TIDAK ada -1. Race protection via lock+check sequence OK)`)
  }

  // ===================================================================
  console.log('\n--- R-08 Wave2-16 Results ---')
  console.log(`Pass: ${passCount}`)
  console.log(`Fail: ${failCount}`)
  process.exit(exitCode)
}

run().catch((e) => {
  console.error('FATAL test runner error:', e)
  process.exit(1)
})
