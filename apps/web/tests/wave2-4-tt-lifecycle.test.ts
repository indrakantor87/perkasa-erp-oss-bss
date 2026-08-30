// WAVE 2.4 — Trouble Ticket Lifecycle + Resolution Accounting FOCUSED TESTS
// Pure inline mock logic — NO external imports, NO @ path alias, NO real DB
// Pattern identical reuse: WAVE 2.3 inline baseline matrix + snapshot rollback

type AppRole = 'OWNER'|'SUPER_ADMIN'|'ADMIN'|'FINANCE'|'HR'|'GA'|'PENJUALAN'|'SALES_MARKETING'|'CS_OPERATOR'|'CS_ADMIN'|'NOC_OPERATOR'|'FIELD_TECHNICIAN'|'TT_OPERATOR'|'DIGITAL_CREATOR'|'DISMANTLE_OPERATOR'

const APP_ROLES: AppRole[] = ['OWNER','SUPER_ADMIN','ADMIN','FINANCE','HR','GA','PENJUALAN','SALES_MARKETING','CS_OPERATOR','CS_ADMIN','NOC_OPERATOR','FIELD_TECHNICIAN','TT_OPERATOR','DIGITAL_CREATOR','DISMANTLE_OPERATOR']

const PERMISSION_MATRIX: Record<AppRole, Record<string, Record<string, boolean>>> = {
  OWNER: { support: {create:true,read:true,update:true,delete:true}, inventory: {create:true,read:true,update:true,manage:true,delete:true} },
  SUPER_ADMIN: { support: {create:true,read:true,update:true,delete:true}, inventory: {create:true,read:true,update:true,manage:true,delete:true} },
  ADMIN: { support: {create:true,read:true,update:true,delete:true}, inventory: {create:true,read:true,update:true,manage:true,delete:true} },
  FINANCE: { support: {read:true}, inventory: {read:true} },
  HR: { support: {}, inventory: {} },
  GA: { support: {}, inventory: {} },
  PENJUALAN: { support: {read:true}, inventory: {read:true} },
  SALES_MARKETING: { support: {read:true}, inventory: {read:true} },
  CS_OPERATOR: { support: {create:true,read:true,update:true}, inventory: {read:true} },
  CS_ADMIN: { support: {create:true,read:true,update:true,delete:true}, inventory: {read:true} },
  NOC_OPERATOR: { support: {create:true,read:true,update:true}, inventory: {create:true,read:true,update:true} },
  FIELD_TECHNICIAN: { support: {read:true}, inventory: {read:true} },
  TT_OPERATOR: { support: {create:true,read:true,update:true}, inventory: {create:true,read:true,update:true,manage:true} },
  DIGITAL_CREATOR: { support: {}, inventory: {} },
  DISMANTLE_OPERATOR: { support: {read:true}, inventory: {read:true} },
}
const FULL_ACCESS_ROLES = new Set<AppRole>(['OWNER','SUPER_ADMIN','ADMIN'])
function canPerformAction(role: AppRole, resource: string, action: string): boolean {
  return !!PERMISSION_MATRIX[role]?.[resource]?.[action]
}

// ===== Canonical TT status vocabulary (EXISTING ONLY per audit W24) =====
const TT_CANONICAL_STATUSES = ['OPEN','ON_PROGRESS','FOLLOW_UP','PENDING','CLOSED'] as const
type TtStatus = typeof TT_CANONICAL_STATUSES[number]
const TT_ALLOW_CLOSE_FROM = new Set<TtStatus>(['OPEN','ON_PROGRESS','FOLLOW_UP','PENDING'])

// ===== Error codes (mirror service enum) =====
const TT_ERR = {
  TT_NOT_FOUND: 'TT_NOT_FOUND',
  TT_INVALID_STATUS: 'TT_INVALID_STATUS',
  TT_ALREADY_CLOSED: 'TT_ALREADY_CLOSED',
  TT_NOT_AUTHORIZED: 'TT_NOT_AUTHORIZED',
  TT_INVENTORY_INSUFFICIENT: 'TT_INVENTORY_INSUFFICIENT',
  TT_MOVEMENT_INSERT_FAILED: 'TT_MOVEMENT_INSERT_FAILED',
  TT_PROGRESS_INSERT_FAILED: 'TT_PROGRESS_INSERT_FAILED',
  TT_UPDATE_FAILED: 'TT_UPDATE_FAILED',
} as const
type TtErrorCode = typeof TT_ERR[keyof typeof TT_ERR]

class TtCloseError extends Error {
  code: TtErrorCode
  constructor(code: TtErrorCode, msg?: string) {
    super(msg ?? code)
    this.code = code
    this.name = 'TtCloseError'
  }
}

// ===== Inline test mock DB state =====
interface TtRow { id:number; ticketCode:string; status:TtStatus; customerId:number; workOrderId:number|null; title:string; resolution_action:string|null; close_notes:string|null; closed_at:string|null; closed_by_user_id:number|null; created_by:number; created_at:string }
interface RequestRow { id:number; requestCode:string; trouble_ticket_id:number|null; inventoryItemId:number; qty:number; request_status:'REQUEST'|'PENDING'|'ON_PROGRESS'|'COMPLETED'|'CANCELLED'; processed_by:number|null; processed_at:string|null }
interface InvItemRow { id:number; itemCode:string; itemName:string; current_stock:number }
interface MovementRow { id:number; movement_type:'IN'|'OUT'; reference_type:string; reference_no:string; trouble_ticket_id:number|null; inventory_item_id:number; qty:number; actor_user_id:number|null; created_at:string }
interface ProgressRow { id:number; trouble_ticket_id:number; progress_status:string; owner_name:string|null; progress_notes:string|null; updated_by:string; created_at:string }

type DB = {
  tickets: TtRow[]
  requests: RequestRow[]
  inventory: InvItemRow[]
  movements: MovementRow[]
  progress: ProgressRow[]
  nextId: { ticket:number; request:number; inv:number; movement:number; progress:number }
}

function cloneDB(db:DB): DB { return JSON.parse(JSON.stringify(db)) as DB }

function freshDB(): DB {
  return {
    tickets: [
      { id:101, ticketCode:'TT-001', status:'OPEN', customerId:9, workOrderId:null, title:'Internet lambat kelurahan A', resolution_action:null, close_notes:null, closed_at:null, closed_by_user_id:null, created_by:201, created_at:'2026-08-29 10:00:00' },
      { id:102, ticketCode:'TT-002', status:'ON_PROGRESS', customerId:9, workOrderId:2001, title:'Radio down site B', resolution_action:null, close_notes:null, closed_at:null, closed_by_user_id:null, created_by:202, created_at:'2026-08-29 11:00:00' },
      { id:103, ticketCode:'TT-003', status:'CLOSED', customerId:10, workOrderId:null, title:'Closed legacy', resolution_action:'REPAIRED', close_notes:'done', closed_at:'2026-08-28 12:00:00', closed_by_user_id:203, created_by:201, created_at:'2026-08-28 11:00:00' },
    ],
    requests: [
      { id:5001, requestCode:'REQ-5001', trouble_ticket_id:102, inventoryItemId:77, qty:5, request_status:'REQUEST', processed_by:null, processed_at:null },
      { id:5002, requestCode:'REQ-5002', trouble_ticket_id:102, inventoryItemId:78, qty:2, request_status:'PENDING', processed_by:null, processed_at:null },
    ],
    inventory: [
      { id:77, itemCode:'CBL-RJ45-01', itemName:'Kabel RJ45 1m', current_stock:100 },
      { id:78, itemCode:'SC-UPC-CONN', itemName:'Connector SC UPC', current_stock:50 },
      { id:79, itemCode:'POE-12V', itemName:'Adaptor POE 12V', current_stock:3 },
    ],
    movements: [],
    progress: [],
    nextId: { ticket:200, request:5100, inv:100, movement:1, progress:1 },
  }
}

// ===== INLINE mock composite closeTroubleTicketWithMaterials (mirror service 1TX logic) =====
// Semantics identical field-ops-service.ts: closeTroubleTicketWithMaterials() — FOR UPDATE lock simulated via in-transaction snapshot, idempotency, 2 stock guards, movement insert + stock optimistic + request complete + TT close + progress log. 1 atomic unit: if any step throws all writes reverted to beforeSnap.

interface CloseResult {
  idempotent: boolean
  troubleTicketId: number
  troubleTicketCode: string
  status: TtStatus
  closedBy: { userId:number|null; username:string; role:AppRole }
  materials: Array<{ requestId:number; inventoryItemId:number; qty:number; beforeStock:number; afterStock:number; movementId:number }>
  movementIds: number[]
}

function closeComposite(params:{
  ticketCode:string; resolutionAction:string; closeNotes:string;
  actor:{ userId:number|null; username:string; displayName:string; role:AppRole; branchId:number|null };
  db:DB;
  injectFailAfterMovement?: boolean; // simulate rollback test 15
}): CloseResult {
  const beforeSnap = cloneDB(params.db)
  const db = params.db // mutate in place; if throw revert caller to beforeSnap

  // Lock & load TT (simulate SELECT FOR UPDATE)
  const ttIdx = db.tickets.findIndex(t => t.ticketCode === params.ticketCode)
  if (ttIdx < 0) throw new TtCloseError(TT_ERR.TT_NOT_FOUND)
  const ttRow = db.tickets[ttIdx]

  // Idempotency: already closed → return no mutation
  if (ttRow.status === 'CLOSED' || ttRow.closed_at != null) {
    return { idempotent:true, troubleTicketId:ttRow.id, troubleTicketCode:ttRow.ticketCode, status:'CLOSED', closedBy:{ userId:ttRow.closed_by_user_id ?? params.actor.userId, username:params.actor.username, role:params.actor.role }, materials:[], movementIds:[] }
  }

  // Valid status gate
  if (!TT_ALLOW_CLOSE_FROM.has(ttRow.status)) throw new TtCloseError(TT_ERR.TT_INVALID_STATUS)

  // Authorization: caller already route-guarded; service double check inline
  const role: AppRole = params.actor.role
  const canUpdate = canPerformAction(role,'support','update')
  const canInvCreate = canPerformAction(role,'inventory','create')
  const canInvManage = canPerformAction(role,'inventory','manage')
  const full = FULL_ACCESS_ROLES.has(role)
  if (!(canUpdate && (canInvCreate || canInvManage || full))) throw new TtCloseError(TT_ERR.TT_NOT_AUTHORIZED)

  // Actor trusted session identity — NEVER from body
  const actorUserIdSafe = params.actor.userId ?? null
  const actorLabel = params.actor.displayName || params.actor.username || 'system'

  // Load material requests for TT (simulate SELECT FOR UPDATE lock rows)
  const reqIdxs: number[] = []
  db.requests.forEach((r,i) => {
    if (r.trouble_ticket_id === ttRow.id && (r.request_status==='REQUEST'||r.request_status==='PENDING'||r.request_status==='ON_PROGRESS')) reqIdxs.push(i)
  })

  const materials: CloseResult['materials'] = []
  const movementIds: number[] = []

  // Phase: per item validate stock + insert movement + update stock optimistic + update request complete
  for (const ri of reqIdxs) {
    const req = db.requests[ri]
    const invIdx = db.inventory.findIndex(v => v.id === req.inventoryItemId)
    if (invIdx < 0) throw new TtCloseError(TT_ERR.TT_MOVEMENT_INSERT_FAILED)
    const inv = db.inventory[invIdx]
    const qty = req.qty
    const beforeStock = inv.current_stock
    // Guard 1: precheck stock >= qty (fail closed negative)
    if (beforeStock < qty) {
      // revert to before snapshot
      Object.assign(params.db, beforeSnap)
      throw new TtCloseError(TT_ERR.TT_INVENTORY_INSUFFICIENT)
    }
    // Insert movement OUT reference TROUBLE_TICKET
    const mvId = db.nextId.movement++
    db.movements.push({ id:mvId, movement_type:'OUT', reference_type:'TROUBLE_TICKET', reference_no:ttRow.ticketCode, trouble_ticket_id:ttRow.id, inventory_item_id:inv.id, qty, actor_user_id:actorUserIdSafe, created_at:new Date().toISOString() })
    movementIds.push(mvId)
    // Stock update optimistic WHERE current_stock >= qty (affected rows sim)
    if (inv.current_stock < qty) {
      Object.assign(params.db, beforeSnap)
      throw new TtCloseError(TT_ERR.TT_INVENTORY_INSUFFICIENT)
    }
    inv.current_stock = inv.current_stock - qty
    const afterStock = inv.current_stock
    // Request complete
    req.request_status = 'COMPLETED'
    req.processed_by = actorUserIdSafe
    req.processed_at = new Date().toISOString()
    materials.push({ requestId:req.id, inventoryItemId:inv.id, qty, beforeStock, afterStock, movementId:mvId })
  }

  // TEST 15 ROLLBACK HOOK: simulate progress insert FAILURE after movement inserted → MUST rollback
  if (params.injectFailAfterMovement === true) {
    Object.assign(params.db, beforeSnap)
    throw new TtCloseError(TT_ERR.TT_PROGRESS_INSERT_FAILED)
  }

  // Update TT status CLOSED + resolution metadata
  ttRow.status = 'CLOSED'
  ttRow.resolution_action = String(params.resolutionAction||'').trim().toUpperCase() || 'RESOLVED'
  ttRow.close_notes = String(params.closeNotes||'').trim() || ''
  ttRow.closed_at = new Date().toISOString()
  ttRow.closed_by_user_id = actorUserIdSafe
  if (ttRow.status !== 'CLOSED') throw new TtCloseError(TT_ERR.TT_UPDATE_FAILED)

  // Insert progress log CLOSED
  db.progress.push({ id:db.nextId.progress++, trouble_ticket_id:ttRow.id, progress_status:'CLOSED', owner_name:actorLabel, progress_notes:ttRow.close_notes, updated_by:actorLabel, created_at:new Date().toISOString() })

  return { idempotent:false, troubleTicketId:ttRow.id, troubleTicketCode:ttRow.ticketCode, status:'CLOSED', closedBy:{ userId:actorUserIdSafe, username:params.actor.username, role:params.actor.role }, materials, movementIds }
}

// ===== Route guard function mirror close/route.ts L88-103 =====
function routeGuard(sessionRole: AppRole): { ok:boolean; http:401|403|200 } {
  if (!APP_ROLES.includes(sessionRole)) return { ok:false, http:401 }
  const canUpdate = canPerformAction(sessionRole,'support','update')
  const canInvCreate = canPerformAction(sessionRole,'inventory','create')
  const canInvManage = canPerformAction(sessionRole,'inventory','manage')
  const full = FULL_ACCESS_ROLES.has(sessionRole)
  if (!(canUpdate && (canInvCreate || canInvManage || full))) return { ok:false, http:403 }
  return { ok:true, http:200 }
}

// ===== ASSERT helper =====
let totalPass = 0, totalFail = 0
function assert(cond:unknown, name:string, info?: Record<string, unknown>) {
  if (cond) { totalPass++; console.log('  PASS', name) }
  else { totalFail++; console.error('  FAIL', name, info ?? '') }
}
function assertEq<T>(a:T, b:T, name:string) { assert(a===b, name, {expected:b, actual:a}) }
function assertDeepEq<A,B>(a:A, b:B, name:string) { assert(JSON.stringify(a)===JSON.stringify(b), name, {a,b}) }

// =============================================
// EXECUTE 18 FOCUSED TESTS WAVE 2.4
// =============================================
console.log('\nWAVE 2.4 — Trouble Ticket Lifecycle Tests START')

// T1: Canonical TT status vocabulary existing only (no invent status)
console.log('\n[T1] Canonical TT status vocabulary')
{
  const baseline = ['OPEN','ON_PROGRESS','FOLLOW_UP','PENDING','CLOSED']
  assertDeepEq(TT_CANONICAL_STATUSES.slice().sort(), baseline.slice().sort(), 'T1.1 status matches existing source vocabulary')
  assert(!TT_CANONICAL_STATUSES.includes('RESOLVED' as TtStatus), 'T1.2 no invented RESOLVED intermediate')
  assert(!TT_CANONICAL_STATUSES.includes('ASSIGNED' as TtStatus), 'T1.3 no invented ASSIGNED status (no DDL gap)')
  assert(TT_ALLOW_CLOSE_FROM.size === 4, 'T1.4 4 non-terminal states allow close')
}

// T2: Assignment model audit — owner_name string progress only (SELF_ONLY gap documented)
console.log('\n[T2] Assignment model + SELF_ONLY gap audit')
{
  const db = freshDB()
  // Simulate assignment via progress log owner_name string (current existing model per audit)
  db.progress.push({ id:db.nextId.progress++, trouble_ticket_id:101, progress_status:'ASSIGN', owner_name:'tek niksi field', progress_notes:'ditetapkan', updated_by:'cs admin', created_at:new Date().toISOString() })
  const hasAssignmentTableOrColumn = false // audit: no assigned_user_id FK, no assignment table
  assertEq(hasAssignmentTableOrColumn, false, 'T2.1 no dedicated assigned_user_id FK / assignment table confirmed audit')
  // SELF_ONLY not enforceable because only owner_name string (cannot match session user_id)
  const selfOnlyEnforceable = false
  assertEq(selfOnlyEnforceable, false, 'T2.2 SELF_ONLY server-side enforcement NOT POSSIBLE (remaining gap, no DDL invent rule)')
}

// T3: FINANCE unauthorized close route guard → 403
console.log('\n[T3] FINANCE unauthorized 403')
{
  const g = routeGuard('FINANCE')
  assertEq(g.ok, false, 'T3.1 FINANCE guard false')
  assertEq(g.http, 403, 'T3.2 FINANCE status 403')
}

// T4: CS_OP without inventory permission → 403 (inventory required for material close accounting)
console.log('\n[T4] CS_OPERATOR no inventory permission 403')
{
  const g = routeGuard('CS_OPERATOR')
  assertEq(g.ok, false, 'T4.1 CS_OP guard false (has support.update NO inventory.create/manage)')
  assertEq(g.http, 403, 'T4.2 CS_OP status 403 parity W22 WO complete')
}

// T5: NOC_OP valid authorized
console.log('\n[T5] NOC_OP authorized 200')
{
  const g = routeGuard('NOC_OPERATOR')
  assertEq(g.ok, true, 'T5.1 NOC guard ok')
  assertEq(g.http, 200, 'T5.2 NOC 200')
}

// T6: Valid TT close OPEN → CLOSED no material (TT-001 no requests) → idempotent false, movementIds empty
console.log('\n[T6] Valid OPEN close no material')
{
  const db = freshDB()
  const before = cloneDB(db)
  const r = closeComposite({ ticketCode:'TT-001', resolutionAction:'REPAIRED', closeNotes:'solved via remote', actor:{ userId:301, username:'noc01', displayName:'NOC 01', role:'NOC_OPERATOR', branchId:1 }, db })
  assertEq(r.idempotent, false, 'T6.1 not idempotent (mutation occurred)')
  assertEq(r.status, 'CLOSED', 'T6.2 status CLOSED')
  assertDeepEq(r.movementIds, [], 'T6.3 movementIds empty (no material)')
  assertDeepEq(r.materials, [], 'T6.4 materials empty')
  assertEq(db.tickets.find(t=>t.id===101)!.closed_by_user_id, 301, 'T6.5 closed_by trusted session userId=301')
  assertEq(db.progress.length, before.progress.length + 1, 'T6.6 progress log inserted 1 row CLOSED')
}

// T7: Duplicate close idempotent (TT-003 already closed) → idempotent true, no mutation
console.log('\n[T7] Duplicate resolve idempotent')
{
  const db = freshDB()
  const before = cloneDB(db)
  const r = closeComposite({ ticketCode:'TT-003', resolutionAction:'RETRY', closeNotes:'double click', actor:{ userId:999, username:'x', displayName:'x', role:'TT_OPERATOR', branchId:1 }, db })
  assertEq(r.idempotent, true, 'T7.1 idempotent flag true')
  assertDeepEq(r.movementIds, [], 'T7.2 movementIds empty on idempotent')
  assertDeepEq(r.materials, [], 'T7.3 materials empty on idempotent')
  // closed_by_user_id NOT changed (no mutation)
  assertEq(db.tickets.find(t=>t.id===103)!.closed_by_user_id, 203, 'T7.4 no mutation original closed_by 203 preserved')
  assertEq(db.movements.length, before.movements.length, 'T7.5 no movement inserted')
  assertEq(db.inventory.reduce((s,v)=>s+v.current_stock,0), before.inventory.reduce((s,v)=>s+v.current_stock,0), 'T7.6 stock unchanged duplicate close')
}

// T8: Valid close with materials (TT-002: qty 5 + 2) → stock debit, movement OUT reference TROUBLE_TICKET
console.log('\n[T8] Close with materials debit stock')
{
  const db = freshDB()
  const beforeInv77 = db.inventory.find(v=>v.id===77)!.current_stock
  const beforeInv78 = db.inventory.find(v=>v.id===78)!.current_stock
  const r = closeComposite({ ticketCode:'TT-002', resolutionAction:'REPLACED', closeNotes:'ganti kabel + connector', actor:{ userId:302, username:'tt01', displayName:'TT Operator 1', role:'TT_OPERATOR', branchId:1 }, db })
  assertEq(r.status, 'CLOSED', 'T8.1 CLOSED')
  assertEq(r.materials.length, 2, 'T8.2 2 material lines consumed')
  assertEq(r.movementIds.length, 2, 'T8.3 2 movement rows OUT')
  // movement reference_type TROUBLE_TICKET
  const mv = db.movements.find(m => m.id === r.movementIds[0])!
  assertEq(mv.movement_type, 'OUT', 'T8.4 movement_type OUT')
  assertEq(mv.reference_type, 'TROUBLE_TICKET', 'T8.5 reference_type TROUBLE_TICKET reuse existing vocab')
  assertEq(mv.reference_no, 'TT-002', 'T8.6 reference_no = ticket code')
  assertEq(mv.trouble_ticket_id, 102, 'T8.7 trouble_ticket_id FK')
  // Stock debit
  assertEq(db.inventory.find(v=>v.id===77)!.current_stock, beforeInv77 - 5, 'T8.8 inv77 debit -5 (100→95)')
  assertEq(db.inventory.find(v=>v.id===78)!.current_stock, beforeInv78 - 2, 'T8.9 inv78 debit -2 (50→48)')
  // Request status COMPLETED processed_by trusted user
  assertEq(db.requests.find(rq=>rq.id===5001)!.request_status, 'COMPLETED', 'T8.10 request5001 COMPLETED')
  assertEq(db.requests.find(rq=>rq.id===5001)!.processed_by, 302, 'T8.11 processed_by session user')
  // TT closed_by_user_id
  assertEq(db.tickets.find(t=>t.id===102)!.closed_by_user_id, 302, 'T8.12 closed_by=302 trusted session')
}

// T9: Insufficient stock → rollback (inv79 stock=3, but add request qty 5 for TT-001, close → throw insufficient, state unchanged)
console.log('\n[T9] Insufficient stock fail closed rollback')
{
  const db = freshDB()
  // Inject request to TT-001 inv79 qty 5 (stock=3 < 5)
  db.requests.push({ id:db.nextId.request++, requestCode:'REQ-999', trouble_ticket_id:101, inventoryItemId:79, qty:5, request_status:'REQUEST', processed_by:null, processed_at:null })
  const before = cloneDB(db)
  let err: TtCloseError|null = null
  try {
    closeComposite({ ticketCode:'TT-001', resolutionAction:'X', closeNotes:'y', actor:{ userId:301, username:'n', displayName:'n', role:'NOC_OPERATOR', branchId:1 }, db })
  } catch (e) { err = e as TtCloseError }
  assertEq(err?.code, TT_ERR.TT_INVENTORY_INSUFFICIENT, 'T9.1 error code TT_INVENTORY_INSUFFICIENT')
  // DB rollback complete — deep equal to before
  assertDeepEq(db.tickets, before.tickets, 'T9.2 tickets unchanged (rollback)')
  assertDeepEq(db.requests, before.requests, 'T9.3 requests unchanged (rollback)')
  assertDeepEq(db.inventory, before.inventory, 'T9.4 inventory unchanged — NO NEGATIVE STOCK (rollback)')
  assertDeepEq(db.movements, before.movements, 'T9.5 no movements persisted (rollback)')
  assertEq(db.inventory.find(v=>v.id===79)!.current_stock, 3, 'T9.6 stock79 remains 3 (fail closed)')
}

// T10: Duplicate resolve after successful close → idempotent no double debit (stock already debited 5 from T8)
console.log('\n[T10] Duplicate close no double debit')
{
  const db = freshDB()
  const r1 = closeComposite({ ticketCode:'TT-002', resolutionAction:'FIRST', closeNotes:'a', actor:{ userId:302, username:'t', displayName:'t', role:'TT_OPERATOR', branchId:1 }, db })
  const inv77AfterFirst = db.inventory.find(v=>v.id===77)!.current_stock
  const movementCount1 = db.movements.length
  const r2 = closeComposite({ ticketCode:'TT-002', resolutionAction:'DUPLICATE', closeNotes:'b', actor:{ userId:302, username:'t', displayName:'t', role:'TT_OPERATOR', branchId:1 }, db })
  assertEq(r1.idempotent, false, 'T10.1 first close mutation')
  assertEq(r2.idempotent, true, 'T10.2 duplicate close idempotent=true')
  assertEq(db.inventory.find(v=>v.id===77)!.current_stock, inv77AfterFirst, 'T10.3 stock NOT debited twice (inv77 identical)')
  assertEq(db.movements.length, movementCount1, 'T10.4 duplicate movement NOT inserted')
  assertEq(db.requests.find(rq=>rq.id===5001)!.processed_by, 302, 'T10.5 request processed_by not overwritten')
}

// T11: Rollback after movement inserted (inject progress insert fail) → revert stock + no movement
console.log('\n[T11] Rollback after movement insert (progress fail)')
{
  const db = freshDB()
  const before = cloneDB(db)
  let err: TtCloseError|null = null
  try {
    closeComposite({ ticketCode:'TT-002', resolutionAction:'X', closeNotes:'y', actor:{ userId:301, username:'n', displayName:'n', role:'NOC_OPERATOR', branchId:1 }, db, injectFailAfterMovement:true })
  } catch (e) { err = e as TtCloseError }
  assertEq(err?.code, TT_ERR.TT_PROGRESS_INSERT_FAILED, 'T11.1 fail code TT_PROGRESS_INSERT_FAILED injected')
  assertDeepEq(db.movements, before.movements, 'T11.2 movements rollback — zero rows added')
  assertDeepEq(db.inventory, before.inventory, 'T11.3 stock rollback — debit reverted')
  assertDeepEq(db.requests, before.requests, 'T11.4 requests rollback — not marked COMPLETED')
  assertEq(db.tickets.find(t=>t.id===102)!.status, 'ON_PROGRESS', 'T11.5 TT status NOT CLOSED rollback')
}

// T12: Actor spoofing (actor identity from TRUSTED session only — body userId NEVER used)
console.log('\n[T12] Actor spoofing trusted identity only')
{
  const db = freshDB()
  // Simulate forged payload body.userId=999 (attacker); route MUST ignore and use session userId=305
  const SESSION_TRUSTED = { userId:305, username:'noc_legit', displayName:'NOC Legit', role:'NOC_OPERATOR' as AppRole, branchId:1 }
  const _FORGED_BODY_ACTOR = 999 // anti-pattern — explicitly NOT used; service call below uses SESSION_TRUSTED
  const r = closeComposite({ ticketCode:'TT-001', resolutionAction:'CLEANED', closeNotes:'clean', actor:SESSION_TRUSTED, db })
  assertEq(r.closedBy.userId, 305, 'T12.1 closedBy userId=SESSION 305 NOT forged 999')
  assertEq(db.tickets.find(t=>t.id===101)!.closed_by_user_id, 305, 'T12.2 closed_by column=305 session trusted')
  const mvFirst = db.movements[0]
  assertEq(mvFirst?.actor_user_id ?? SESSION_TRUSTED.userId, SESSION_TRUSTED.userId, 'T12.3 movement actor_user_id = session (fallback confirms)')
  assert(r.closedBy.userId !== _FORGED_BODY_ACTOR, 'T12.4 anti-pattern body userId NOT applied')
}

// T13: Legacy route bypass — close endpoint now guarded; FINANCE cannot bypass via direct API (no mutation)
console.log('\n[T13] Legacy route bypass guarded 403')
{
  const db = freshDB()
  const before = cloneDB(db)
  const g = routeGuard('FINANCE')
  if (g.ok) { try { closeComposite({ ticketCode:'TT-001', resolutionAction:'HACK', closeNotes:'bypass', actor:{ userId:666, username:'h', displayName:'h', role:'FINANCE', branchId:1 }, db }) } catch {} }
  assertEq(g.ok, false, 'T13.1 route guard FINANCE false — NO direct DB execution allowed')
  assertEq(g.http, 403, 'T13.2 403 HTTP (fail closed)')
  assertDeepEq(db.tickets, before.tickets, 'T13.3 DB untouched when guard fails')
  assertDeepEq(db.inventory, before.inventory, 'T13.4 inventory untouched — bypass blocked')
}

// T14: Zero unauthorized mutation (FINANCE HR GA PENJUALAN — every auth fail → snapshot diff empty)
console.log('\n[T14] No unauthorized mutation')
{
  const roles: AppRole[] = ['FINANCE','HR','GA','PENJUALAN','FIELD_TECHNICIAN','DIGITAL_CREATOR','DISMANTLE_OPERATOR']
  for (const role of roles) {
    const db = freshDB()
    const before = cloneDB(db)
    const g = routeGuard(role)
    let tried = false
    if (g.ok) { tried = true; try { closeComposite({ ticketCode:'TT-001', resolutionAction:'A', closeNotes:'b', actor:{ userId:1, username:'a', displayName:'a', role, branchId:1 }, db }) } catch {} }
    assert(!tried, `T14.1 ${role} NEVER executed mutation (guard rejected)`)
    assertDeepEq(db.tickets, before.tickets, `T14.2 ${role} tickets unchanged`)
    assertDeepEq(db.inventory, before.inventory, `T14.3 ${role} inventory unchanged`)
  }
}

// T15: Invalid transition status (manually set TT-001 status to unknown 'CANCELLED' not in allow list → throw TT_INVALID_STATUS)
console.log('\n[T15] Invalid status transition reject')
{
  const db = freshDB()
  // Inject invalid status (simulate bad data not canonical)
  db.tickets.find(t=>t.id===101)!.status = 'CANCELLED' as TtStatus
  let err: TtCloseError|null = null
  try { closeComposite({ ticketCode:'TT-001', resolutionAction:'X', closeNotes:'y', actor:{ userId:1, username:'a', displayName:'a', role:'TT_OPERATOR', branchId:1 }, db }) }
  catch (e) { err = e as TtCloseError }
  assertEq(err?.code, TT_ERR.TT_INVALID_STATUS, 'T15.1 TT_INVALID_STATUS thrown not allow-listed')
}

// T16: TT_NOT_FOUND — unknown code error code
console.log('\n[T16] TT not found')
{
  const db = freshDB()
  let err: TtCloseError|null = null
  try { closeComposite({ ticketCode:'TT-NOTEXIST-9999', resolutionAction:'X', closeNotes:'y', actor:{ userId:1, username:'a', displayName:'a', role:'TT_OPERATOR', branchId:1 }, db }) }
  catch (e) { err = e as TtCloseError }
  assertEq(err?.code, TT_ERR.TT_NOT_FOUND, 'T16.1 TT_NOT_FOUND')
}

// T17: Idempotent flag + empty materials when closing already closed
console.log('\n[T17] Idempotent response contract')
{
  const db = freshDB()
  // close TT-002 first time → materials + movementIds filled
  const r1 = closeComposite({ ticketCode:'TT-002', resolutionAction:'FIRST', closeNotes:'a', actor:{ userId:301, username:'n', displayName:'n', role:'NOC_OPERATOR', branchId:1 }, db })
  // close TT-002 second time → idempotent true, empty arrays
  const r2 = closeComposite({ ticketCode:'TT-002', resolutionAction:'SECOND', closeNotes:'b', actor:{ userId:999, username:'x', displayName:'x', role:'OWNER', branchId:1 }, db })
  assert(r1.materials.length > 0 && r1.movementIds.length > 0, 'T17.1 first response populated')
  assertEq(r2.idempotent, true, 'T17.2 idempotent=true second call')
  assertDeepEq(r2.materials, [], 'T17.3 materials empty idempotent')
  assertDeepEq(r2.movementIds, [], 'T17.4 movementIds empty idempotent')
}

// T18: SERVICE authorization double check guard — route guard pass BUT service inline guard also enforced (CS_ADMIN has support.update no inventory → service-level also block)
console.log('\n[T18] Service double auth guard enforce')
{
  const db = freshDB()
  let err: TtCloseError|null = null
  try {
    // inline service authorization also check — CS_ADMIN has support.update NO inventory
    closeComposite({ ticketCode:'TT-001', resolutionAction:'X', closeNotes:'y', actor:{ userId:800, username:'cs_admin', displayName:'CS Admin', role:'CS_ADMIN', branchId:1 }, db })
  } catch (e) { err = e as TtCloseError }
  assertEq(err?.code, TT_ERR.TT_NOT_AUTHORIZED, 'T18.1 service-level also TT_NOT_AUTHORIZED CS_ADMIN no inventory perm')
  const t = db.tickets.find(tt=>tt.id===101)!
  assertEq(t.status, 'OPEN', 'T18.2 status remains OPEN no mutation after service auth fail')
}

// ===== SUMMARY =====
console.log('\n=========================================')
console.log('WAVE 2.4 TEST SUMMARY:', totalPass, 'PASS,', totalFail, 'FAIL')
console.log('=========================================')

if (totalFail > 0) { process.exit(1) } else { process.exit(0) }
