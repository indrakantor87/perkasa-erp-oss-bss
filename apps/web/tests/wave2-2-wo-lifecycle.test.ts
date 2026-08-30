import assert from 'node:assert/strict'

type AppRole = string

const APP_ROLES: readonly AppRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'NOC_OPERATOR',
  'TT_OPERATOR',
  'TEKNISI',
  'TEKNISI_PSB',
  'FIELD_TECHNICIAN',
  'MARKETING',
  'SUPPORT',
  'FINANCE',
  'GUEST',
] as const

function isAppRole(v: string): v is AppRole {
  return (APP_ROLES as readonly string[]).includes(v)
}

const PERMISSION_MATRIX: Array<{ resource: string; actions: readonly string[]; roles: readonly AppRole[] }> = [
  { resource: 'support', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'], roles: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR', 'SUPPORT'] },
  { resource: 'inventory', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'], roles: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'] },
]

function canPerformAction(role: AppRole, resource: string, action: string): boolean {
  const entry = PERMISSION_MATRIX.find((m) => m.resource === resource)
  if (!entry) return false
  if (!entry.actions.includes(action)) return false
  return entry.roles.includes(role)
}

const VALID_WO_TRANSITIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['OPEN', new Set(['SCHEDULED', 'ON_PROGRESS', 'CANCELLED', 'COMPLETED'])],
  ['SCHEDULED', new Set(['OPEN', 'ON_PROGRESS', 'CANCELLED', 'COMPLETED'])],
  ['ON_PROGRESS', new Set(['SCHEDULED', 'COMPLETED', 'CANCELLED'])],
  ['PENDING', new Set(['OPEN', 'SCHEDULED', 'ON_PROGRESS', 'COMPLETED', 'CANCELLED'])],
])

const NON_TERMINAL_WO_STATUSES = new Set(['OPEN', 'SCHEDULED', 'ON_PROGRESS', 'PENDING'])

type WO = {
  id: number
  workOrderNo: string
  status: string
  completedAt: string | null
  closedByUserId: number | null
  currentPicUserId: number | null
  scheduledAt: string | null
  scheduledByUserId: number | null
  startedAt: string | null
}

type MaterialRequest = {
  id: number
  requestCode: string
  inventoryItemId: number
  workOrderId: number
  requestQty: number
  requestStatus: 'REQUEST' | 'ON_PROGRESS' | 'PENDING' | 'COMPLETED'
  completedAt: string | null
  processedBy: string | null
}

type InventoryItem = {
  id: number
  itemCode: string
  currentStock: number
}

type Movement = {
  id: number
  itemId: number
  workOrderId: number
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT'
  referenceType: string
  referenceNo: string
  qty: number
  notes: string
  actorUserId: number | null
}

type StatusLog = {
  id: number
  workOrderId: number
  fromStatus: string | null
  toStatus: string
  reasonCode: string | null
  reasonNotes: string | null
  changedByUserId: number | null
  changedAt: string
}

type DbState = {
  nextWOId: number
  nextReqId: number
  nextItemId: number
  nextMvId: number
  nextLogId: number
  workOrders: Map<number, WO>
  requests: Map<number, MaterialRequest>
  items: Map<number, InventoryItem>
  movements: Movement[]
  logs: StatusLog[]
  txErrorAt: string | null
  writeOrder: string[]
}

function makeDbState(): DbState {
  return {
    nextWOId: 1,
    nextReqId: 1,
    nextItemId: 1,
    nextMvId: 1,
    nextLogId: 1,
    workOrders: new Map(),
    requests: new Map(),
    items: new Map(),
    movements: [],
    logs: [],
    txErrorAt: null,
    writeOrder: [],
  }
}

function insertWO(db: DbState, status: string, overrides: Partial<WO> = {}): WO {
  const id = db.nextWOId++
  const row: WO = {
    id,
    workOrderNo: `WO-${String(id).padStart(4, '0')}`,
    status,
    completedAt: null,
    closedByUserId: null,
    currentPicUserId: null,
    scheduledAt: null,
    scheduledByUserId: null,
    startedAt: null,
    ...overrides,
  }
  db.workOrders.set(id, row)
  return row
}

function insertItem(db: DbState, code: string, stock: number): InventoryItem {
  const id = db.nextItemId++
  const row: InventoryItem = { id, itemCode: code, currentStock: stock }
  db.items.set(id, row)
  return row
}

function insertRequest(db: DbState, workOrderId: number, inventoryItemId: number, qty: number): MaterialRequest {
  const id = db.nextReqId++
  const row: MaterialRequest = {
    id,
    requestCode: `REQ-${String(id).padStart(4, '0')}`,
    inventoryItemId,
    workOrderId,
    requestQty: qty,
    requestStatus: 'REQUEST',
    completedAt: null,
    processedBy: null,
  }
  db.requests.set(id, row)
  return row
}

type CompletionResult = {
  success: boolean
  idempotent: boolean
  workOrderId: number
  workOrderNo: string
  status: string
  closedByUserId: number | null
  closedAt: string | null
  materials: Array<{
    requestId: number
    requestCode: string
    inventoryItemId: number
    itemCode: string | null
    qty: number
    beforeStock: number
    afterStock: number
    movementId: number | null
  }>
  movementIds: number[]
}

const WO_COMPLETION_ERROR_CODES = {
  WO_NOT_FOUND: 'WO_NOT_FOUND',
  WO_STATUS_INVALID: 'WO_STATUS_INVALID',
  WO_ALREADY_COMPLETED: 'WO_ALREADY_COMPLETED',
  WO_ALREADY_CANCELLED: 'WO_ALREADY_CANCELLED',
  INVENTORY_ITEM_INSUFFICIENT: 'INVENTORY_ITEM_INSUFFICIENT',
  INVENTORY_ITEM_NOT_FOUND: 'INVENTORY_ITEM_NOT_FOUND',
  WO_UPDATE_FAILED: 'WO_UPDATE_FAILED',
  REQUEST_UPDATE_FAILED: 'REQUEST_UPDATE_FAILED',
} as const

type WOCompletionCode = (typeof WO_COMPLETION_ERROR_CODES)[keyof typeof WO_COMPLETION_ERROR_CODES]

class WorkOrderCompletionError extends Error {
  readonly code: WOCompletionCode
  readonly details?: unknown
  constructor(code: WOCompletionCode, message: string, details?: unknown) {
    super(message)
    this.name = 'WorkOrderCompletionError'
    this.code = code
    this.details = details
  }
}

class MockTransactionError extends Error {
  readonly stage: string
  constructor(stage: string) {
    super(`Mock rollback at: ${stage}`)
    this.name = 'MockTransactionError'
    this.stage = stage
  }
}

function cloneState(db: DbState): DbState {
  const workOrdersCloned = new Map<number, WO>()
  for (const [k, v] of db.workOrders) workOrdersCloned.set(k, { ...v })
  const requestsCloned = new Map<number, MaterialRequest>()
  for (const [k, v] of db.requests) requestsCloned.set(k, { ...v })
  const itemsCloned = new Map<number, InventoryItem>()
  for (const [k, v] of db.items) itemsCloned.set(k, { ...v })
  return {
    nextWOId: db.nextWOId,
    nextReqId: db.nextReqId,
    nextItemId: db.nextItemId,
    nextMvId: db.nextMvId,
    nextLogId: db.nextLogId,
    workOrders: workOrdersCloned,
    requests: requestsCloned,
    items: itemsCloned,
    movements: db.movements.map((m) => ({ ...m })),
    logs: db.logs.map((l) => ({ ...l })),
    txErrorAt: db.txErrorAt,
    writeOrder: db.writeOrder.slice(),
  }
}

function completeWOWithMaterials(db: DbState, workOrderId: number, actorUserId: number | null, actorUsername: string | null, reasonNotes?: string | null): CompletionResult {
  const snapshot = cloneState(db)
  try {
    const wo = db.workOrders.get(workOrderId)
    if (!wo) {
      throw new WorkOrderCompletionError(WO_COMPLETION_ERROR_CODES.WO_NOT_FOUND, 'WO tidak ditemukan.', { workOrderId })
    }
    const fromStatus = String(wo.status ?? 'OPEN').trim().toUpperCase()
    if (fromStatus === 'COMPLETED') {
      return {
        success: true,
        idempotent: true,
        workOrderId: wo.id,
        workOrderNo: wo.workOrderNo,
        status: 'COMPLETED',
        closedByUserId: wo.closedByUserId,
        closedAt: wo.completedAt,
        materials: [],
        movementIds: [],
      }
    }
    if (fromStatus === 'CANCELLED') {
      throw new WorkOrderCompletionError(WO_COMPLETION_ERROR_CODES.WO_ALREADY_CANCELLED, 'WO sudah cancelled.', { workOrderId, status: fromStatus })
    }
    if (!NON_TERMINAL_WO_STATUSES.has(fromStatus)) {
      throw new WorkOrderCompletionError(WO_COMPLETION_ERROR_CODES.WO_STATUS_INVALID, `Status ${fromStatus} invalid.`, { workOrderId, status: fromStatus })
    }

    const requests = [...db.requests.values()].filter((r) => r.workOrderId === workOrderId && ['REQUEST', 'ON_PROGRESS', 'PENDING'].includes(r.requestStatus)).sort((a, b) => a.id - b.id)
    const materials: CompletionResult['materials'] = []
    const movementIds: number[] = []

    for (const req of requests) {
      const qty = Number(req.requestQty ?? 0)
      if (!Number.isFinite(qty) || qty <= 0) continue
      const item = db.items.get(req.inventoryItemId)
      if (!item) {
        throw new WorkOrderCompletionError(WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_NOT_FOUND, `Item tidak ditemukan untuk req ${req.requestCode}.`, { requestId: req.id, inventoryItemId: req.inventoryItemId })
      }
      const beforeStock = Number(item.currentStock ?? 0)
      if (beforeStock < qty) {
        throw new WorkOrderCompletionError(WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_INSUFFICIENT, `Stok tidak cukup: butuh ${qty}, tersedia ${beforeStock}.`, { inventoryItemId: item.id, itemCode: item.itemCode, required: qty, available: beforeStock })
      }

      const mv: Movement = {
        id: db.nextMvId++,
        itemId: item.id,
        workOrderId: workOrderId,
        movementType: 'OUT',
        referenceType: 'WORK_ORDER',
        referenceNo: wo.workOrderNo,
        qty,
        notes: `WO ${wo.workOrderNo} | req ${req.requestCode} | debit qty ${qty} | user:${actorUsername ?? 'system'}`,
        actorUserId,
      }
      db.movements.push(mv)
      movementIds.push(mv.id)
      db.writeOrder.push(`movement:${mv.id}`)

      const newStock = beforeStock - qty
      if (newStock < 0) {
        throw new WorkOrderCompletionError(WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_INSUFFICIENT, `Stok negatif terdeteksi.`, { itemCode: item.itemCode })
      }
      db.items.set(item.id, { ...item, currentStock: newStock })
      db.writeOrder.push(`stock:${item.id}`)

      if (db.txErrorAt === 'after_movement') {
        throw new MockTransactionError('after_movement')
      }

      req.requestStatus = 'COMPLETED'
      req.completedAt = new Date().toISOString()
      req.processedBy = `user:${actorUsername ?? 'system'}`
      db.writeOrder.push(`req:${req.id}`)

      materials.push({
        requestId: req.id,
        requestCode: req.requestCode,
        inventoryItemId: item.id,
        itemCode: item.itemCode,
        qty,
        beforeStock,
        afterStock: newStock,
        movementId: mv.id,
      })
    }

    const beforeWOStatus = wo.status
    wo.status = 'COMPLETED'
    wo.completedAt = new Date().toISOString()
    wo.closedByUserId = actorUserId
    db.writeOrder.push(`wo:${wo.id}`)

    if (db.txErrorAt === 'after_wo_update') {
      throw new MockTransactionError('after_wo_update')
    }

    db.logs.push({
      id: db.nextLogId++,
      workOrderId: wo.id,
      fromStatus: beforeWOStatus,
      toStatus: 'COMPLETED',
      reasonCode: 'WO_COMPLETION',
      reasonNotes: (reasonNotes && String(reasonNotes).trim()) || `WO diselesaikan dengan ${materials.length} material line. Actor: user:${actorUsername ?? 'system'}`,
      changedByUserId: actorUserId,
      changedAt: new Date().toISOString(),
    })
    db.writeOrder.push('status_log')

    return {
      success: true,
      idempotent: false,
      workOrderId: wo.id,
      workOrderNo: wo.workOrderNo,
      status: 'COMPLETED',
      closedByUserId: actorUserId,
      closedAt: wo.completedAt,
      materials,
      movementIds,
    }
  } catch (err) {
    db.workOrders = snapshot.workOrders
    db.requests = snapshot.requests
    db.items = snapshot.items
    db.movements = snapshot.movements
    db.logs = snapshot.logs
    db.nextWOId = snapshot.nextWOId
    db.nextReqId = snapshot.nextReqId
    db.nextItemId = snapshot.nextItemId
    db.nextMvId = snapshot.nextMvId
    db.nextLogId = snapshot.nextLogId
    db.writeOrder = snapshot.writeOrder
    throw err
  }
}

const WO_CANCEL_ERROR_CODES = {
  WO_NOT_FOUND: 'WO_NOT_FOUND',
  WO_ALREADY_COMPLETED: 'WO_ALREADY_COMPLETED',
  WO_ALREADY_CANCELLED: 'WO_ALREADY_CANCELLED',
  WO_STATUS_INVALID: 'WO_STATUS_INVALID',
} as const

type WOCancelCode = (typeof WO_CANCEL_ERROR_CODES)[keyof typeof WO_CANCEL_ERROR_CODES]
class WorkOrderCancelError extends Error {
  readonly code: WOCancelCode
  constructor(code: WOCancelCode, message: string) {
    super(message)
    this.name = 'WorkOrderCancelError'
    this.code = code
  }
}

type CancelResult = { success: boolean; idempotent: boolean; workOrderId: number; workOrderNo: string; status: string }

function cancelWO(db: DbState, workOrderId: number): CancelResult {
  const snapshot = cloneState(db)
  try {
    const wo = db.workOrders.get(workOrderId)
    if (!wo) throw new WorkOrderCancelError(WO_CANCEL_ERROR_CODES.WO_NOT_FOUND, 'WO tidak ditemukan.')
    const fromStatus = String(wo.status ?? 'OPEN').trim().toUpperCase()
    if (fromStatus === 'CANCELLED') return { success: true, idempotent: true, workOrderId: wo.id, workOrderNo: wo.workOrderNo, status: 'CANCELLED' }
    if (fromStatus === 'COMPLETED') throw new WorkOrderCancelError(WO_CANCEL_ERROR_CODES.WO_ALREADY_COMPLETED, 'WO sudah completed.')
    if (!NON_TERMINAL_WO_STATUSES.has(fromStatus)) throw new WorkOrderCancelError(WO_CANCEL_ERROR_CODES.WO_STATUS_INVALID, `Status ${fromStatus} invalid.`)
    wo.status = 'CANCELLED'
    return { success: true, idempotent: false, workOrderId: wo.id, workOrderNo: wo.workOrderNo, status: 'CANCELLED' }
  } catch (e) {
    db.workOrders = snapshot.workOrders
    db.requests = snapshot.requests
    db.items = snapshot.items
    db.movements = snapshot.movements
    db.logs = snapshot.logs
    throw e
  }
}

const WO_TRANSITION_ERROR_CODES = {
  WO_NOT_FOUND: 'WO_NOT_FOUND',
  WO_ALREADY_COMPLETED: 'WO_ALREADY_COMPLETED',
  WO_ALREADY_CANCELLED: 'WO_ALREADY_CANCELLED',
  WO_TRANSITION_ILLEGAL: 'WO_TRANSITION_ILLEGAL',
} as const

type WOTransitionCode = (typeof WO_TRANSITION_ERROR_CODES)[keyof typeof WO_TRANSITION_ERROR_CODES]
class WorkOrderTransitionError extends Error {
  readonly code: WOTransitionCode
  constructor(code: WOTransitionCode, message: string) {
    super(message)
    this.name = 'WorkOrderTransitionError'
    this.code = code
  }
}

type TransitionResult = { success: boolean; idempotent: boolean; workOrderId: number; workOrderNo: string; fromStatus: string; toStatus: string }

function transitionWO(db: DbState, workOrderId: number, toStatus: 'OPEN' | 'SCHEDULED' | 'ON_PROGRESS'): TransitionResult {
  const snapshot = cloneState(db)
  try {
    const wo = db.workOrders.get(workOrderId)
    if (!wo) throw new WorkOrderTransitionError(WO_TRANSITION_ERROR_CODES.WO_NOT_FOUND, 'WO tidak ditemukan.')
    const fromStatus = String(wo.status ?? 'OPEN').trim().toUpperCase()
    if (fromStatus === toStatus) return { success: true, idempotent: true, workOrderId: wo.id, workOrderNo: wo.workOrderNo, fromStatus, toStatus }
    if (fromStatus === 'COMPLETED') throw new WorkOrderTransitionError(WO_TRANSITION_ERROR_CODES.WO_ALREADY_COMPLETED, 'WO sudah completed.')
    if (fromStatus === 'CANCELLED') throw new WorkOrderTransitionError(WO_TRANSITION_ERROR_CODES.WO_ALREADY_CANCELLED, 'WO sudah cancelled.')
    const allowed = VALID_WO_TRANSITIONS.get(fromStatus)
    if (!allowed || !allowed.has(toStatus)) {
      throw new WorkOrderTransitionError(WO_TRANSITION_ERROR_CODES.WO_TRANSITION_ILLEGAL, `Transisi ${fromStatus} → ${toStatus} tidak diijinkan.`)
    }
    wo.status = toStatus
    return { success: true, idempotent: false, workOrderId: wo.id, workOrderNo: wo.workOrderNo, fromStatus, toStatus }
  } catch (e) {
    db.workOrders = snapshot.workOrders
    db.requests = snapshot.requests
    db.items = snapshot.items
    db.movements = snapshot.movements
    db.logs = snapshot.logs
    throw e
  }
}

type TestFn = () => void | Promise<void>
type TestDef = { name: string; fn: TestFn }
const tests: TestDef[] = []
function test(name: string, fn: TestFn) {
  tests.push({ name, fn })
}
const results: Array<{ name: string; status: 'PASS' | 'FAIL' | 'SKIP'; err?: string }> = []

async function runAll() {
  for (const t of tests) {
    try {
      await t.fn()
      results.push({ name: t.name, status: 'PASS' })
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      results.push({ name: t.name, status: 'FAIL', err: message })
    }
  }
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  for (const r of results) {
    const suffix = r.status === 'FAIL' && r.err ? ` (${r.err})` : ''
    console.log(`[${r.status}] ${r.name}${suffix}`)
  }
  console.log(`\nSUMMARY: ${passed}/${total} PASS, ${failed} FAIL`)
  if (failed > 0) process.exitCode = 1
}

test('1. Lifecycle OPEN → SCHEDULED transition valid', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'OPEN')
  const r = transitionWO(db, wo.id, 'SCHEDULED')
  assert.equal(r.success, true)
  assert.equal(r.idempotent, false)
  assert.equal(r.toStatus, 'SCHEDULED')
  assert.equal(db.workOrders.get(wo.id)?.status, 'SCHEDULED')
})

test('2. Lifecycle SCHEDULED → ON_PROGRESS transition valid', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'SCHEDULED')
  const r = transitionWO(db, wo.id, 'ON_PROGRESS')
  assert.equal(r.success, true)
  assert.equal(r.toStatus, 'ON_PROGRESS')
  assert.equal(db.workOrders.get(wo.id)?.status, 'ON_PROGRESS')
})

test('3. ON_PROGRESS → COMPLETED WITH material: before 100, consume 5, after 95; movement OUT qty 5', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'ON_PROGRESS')
  const item = insertItem(db, 'RG45-CAT6', 100)
  insertRequest(db, wo.id, item.id, 5)
  const beforeMvCount = db.movements.length
  const r = completeWOWithMaterials(db, wo.id, 1, 'admin-01')
  assert.equal(r.success, true)
  assert.equal(r.idempotent, false)
  assert.equal(r.status, 'COMPLETED')
  assert.equal(r.materials.length, 1)
  assert.equal(r.materials[0].beforeStock, 100)
  assert.equal(r.materials[0].qty, 5)
  assert.equal(r.materials[0].afterStock, 95)
  assert.equal(db.items.get(item.id)?.currentStock, 95)
  assert.equal(db.movements.length, beforeMvCount + 1)
  const mv = db.movements[beforeMvCount]
  assert.equal(mv.movementType, 'OUT')
  assert.equal(mv.qty, 5)
  assert.equal(mv.workOrderId, wo.id)
  assert.equal(r.movementIds.includes(mv.id), true)
  assert.equal(db.workOrders.get(wo.id)?.status, 'COMPLETED')
  assert.equal(db.logs.length, 1)
  assert.equal(db.logs[0].toStatus, 'COMPLETED')
  assert.equal(db.logs[0].reasonCode, 'WO_COMPLETION')
})

test('4. Completion zero materials: no movement, status COMPLETED', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'ON_PROGRESS')
  const beforeMv = db.movements.length
  const r = completeWOWithMaterials(db, wo.id, 1, 'admin-01')
  assert.equal(r.success, true)
  assert.equal(r.materials.length, 0)
  assert.equal(db.movements.length, beforeMv)
  assert.equal(db.workOrders.get(wo.id)?.status, 'COMPLETED')
})

test('5. Insufficient stock: before 5, consume 10 → error INVENTORY_ITEM_INSUFFICIENT; rollback stock tetap 5', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'ON_PROGRESS')
  const item = insertItem(db, 'PATCH-CORD-1M', 5)
  insertRequest(db, wo.id, item.id, 10)
  const beforeStock = db.items.get(item.id)?.currentStock
  const beforeMv = db.movements.length
  assert.throws(() => completeWOWithMaterials(db, wo.id, 1, 'admin-01'), (err: unknown) => {
    if (err instanceof WorkOrderCompletionError) {
      return err.code === WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_INSUFFICIENT
    }
    return false
  })
  assert.equal(db.items.get(item.id)?.currentStock, beforeStock)
  assert.equal(db.movements.length, beforeMv)
  assert.equal(db.workOrders.get(wo.id)?.status, 'ON_PROGRESS')
})

test('6. Duplicate completion idempotent: POST complete × 2 → NO second debit (movement count 1, stock tetap 95)', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'ON_PROGRESS')
  const item = insertItem(db, 'F-CONNECTOR', 100)
  insertRequest(db, wo.id, item.id, 5)
  const r1 = completeWOWithMaterials(db, wo.id, 1, 'admin-01')
  assert.equal(r1.idempotent, false)
  const stockAfterFirst = db.items.get(item.id)?.currentStock
  const mvAfterFirst = db.movements.length
  const r2 = completeWOWithMaterials(db, wo.id, 1, 'admin-01')
  assert.equal(r2.success, true)
  assert.equal(r2.idempotent, true)
  assert.equal(r2.materials.length, 0)
  assert.equal(db.items.get(item.id)?.currentStock, stockAfterFirst)
  assert.equal(db.movements.length, mvAfterFirst)
})

test('7. Invalid status transition: COMPLETED → OPEN throws WO_ALREADY_COMPLETED', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'COMPLETED', { completedAt: new Date().toISOString(), closedByUserId: 5 })
  assert.throws(() => transitionWO(db, wo.id, 'OPEN'), (err: unknown) => {
    if (err instanceof WorkOrderTransitionError) {
      return err.code === WO_TRANSITION_ERROR_CODES.WO_ALREADY_COMPLETED
    }
    return false
  })
})

test('8. Transaction rollback: movement inserted, WO update fails → stock revert (movements & items back to snapshot)', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'ON_PROGRESS')
  const item = insertItem(db, 'PIGTAIL-SC/UPC', 100)
  insertRequest(db, wo.id, item.id, 5)
  const beforeStock = db.items.get(item.id)?.currentStock
  const beforeMv = db.movements.length
  db.txErrorAt = 'after_wo_update'
  assert.throws(() => completeWOWithMaterials(db, wo.id, 1, 'admin-01'), MockTransactionError)
  assert.equal(db.items.get(item.id)?.currentStock, beforeStock)
  assert.equal(db.movements.length, beforeMv)
  assert.equal(db.workOrders.get(wo.id)?.status, 'ON_PROGRESS')
})

test('9. Unauthorized role FIELD_TECHNICIAN → forbidden (permission gate)', () => {
  const role: AppRole = 'FIELD_TECHNICIAN'
  const hasRole = isAppRole(role)
  assert.equal(hasRole, true)
  const canUpdateSupport = canPerformAction(role, 'support', 'update')
  const canCreateInventory = canPerformAction(role, 'inventory', 'create')
  const fullAccess = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'].includes(role)
  const authorized = canUpdateSupport && (canCreateInventory || fullAccess)
  assert.equal(authorized, false)
})

test('10. Cancellation: OPEN → CANCELLED terminal, idempotent second call', () => {
  const db = makeDbState()
  const wo = insertWO(db, 'OPEN')
  const r1 = cancelWO(db, wo.id)
  assert.equal(r1.success, true)
  assert.equal(r1.idempotent, false)
  assert.equal(r1.status, 'CANCELLED')
  assert.equal(db.workOrders.get(wo.id)?.status, 'CANCELLED')
  const r2 = cancelWO(db, wo.id)
  assert.equal(r2.idempotent, true)
})

test('11. Static type contract & role check OWNER authorized (full access)', () => {
  const role: AppRole = 'OWNER'
  const canUpdateSupport = canPerformAction(role, 'support', 'update')
  const canCreateInventory = canPerformAction(role, 'inventory', 'create')
  const canManageInventory = canPerformAction(role, 'inventory', 'manage')
  const fullAccess = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'].includes(role)
  const authorized = canUpdateSupport && (canCreateInventory || canManageInventory || fullAccess)
  assert.equal(authorized, true)
})

void runAll()
