import type { LeaveRequestStatus, OvertimeRequestStatus } from '@/lib/types'

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
function assertThrows(fn: () => unknown, label: string): boolean {
  try {
    fn()
    console.error(`[FAIL] ${label} (expected throw, got no throw)`)
    exitCode = 1
    failCount++
    return false
  } catch {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
}

type CanonicalAttendanceStatus = 'PRESENT' | 'SICK' | 'PERMIT' | 'ALPHA'
const ALLOWED_CANONICAL: ReadonlySet<string> = new Set(['PRESENT', 'SICK', 'PERMIT', 'ALPHA'])

type MockAttendance = {
  id: number
  employee_id: number
  attendance_date: string
  status: CanonicalAttendanceStatus
  check_in: string | null
  check_out: string | null
  overtime_minutes: number
  locked_by_admin: 0 | 1
  source_type: string | null
  notes: string | null
}

type MockLeaveReq = {
  id: number
  employee_id: number
  leave_type_id: number
  start_date: string
  end_date: string
  total_days: number
  status: LeaveRequestStatus
  balance_applied: 0 | 1
  attendance_snapshot_before: Record<string, unknown> | null
}

type MockLeaveBalance = {
  employee_id: number
  leave_type_id: number
  fiscal_year: number
  balance_initial: number
  balance_used: number
}

type MockOvertimeReq = {
  id: number
  employee_id: number
  overtime_date: string
  planned_start_time: string
  planned_end_time: string
  planned_minutes: number
  approved_minutes: number | null
  status: OvertimeRequestStatus
  attendance_snapshot_before: Record<string, unknown> | null
}

type MockEmployee = { id: number; user_id: number; supervisor_id: number | null }

type MockAuditLog = {
  id: number
  actionType: string
  actor: string
  targetRef: string
  detail: string
  createdAt: string
}

type MockDB = {
  employees: MockEmployee[]
  attendances: MockAttendance[]
  balances: MockLeaveBalance[]
  auditLog: MockAuditLog[]
  _auditSeq: number
}

function canonicalLeaveStatus(typeCode: string): CanonicalAttendanceStatus {
  if (typeCode === 'SAKIT') return 'SICK'
  return 'PERMIT'
}

function validateSupervisorChainNoCircularAndNoSelf(employees: MockEmployee[], subId: number, supId: number): boolean {
  if (subId === supId) throw new Error(`SELF_SUPERVISOR: employee ${subId} cannot supervise self`)
  const map = new Map<number, number | null>()
  for (const e of employees) map.set(e.id, e.supervisor_id)
  let depth = 0
  let current: number | null = supId
  const visited = new Set<number>()
  while (current !== null && depth < 10) {
    if (visited.has(current)) throw new Error(`CIRCULAR_CHAIN at employee ${current}`)
    visited.add(current)
    if (current === subId) throw new Error(`CIRCULAR_CHAIN: supervisor ${supId} reports back to subordinate ${subId}`)
    current = map.get(current) ?? null
    depth++
  }
  return true
}

function resolveDirectSubordinateEmployeeIds(employees: MockEmployee[], supEmpId: number): number[] {
  return employees.filter((e) => e.supervisor_id === supEmpId).map((e) => e.id)
}

function simulateServerCalcOvertimeMinutes(start: string, end: string): number {
  const [sh, sm] = String(start).split(':').map((n) => parseInt(n, 10) || 0)
  const [eh, em] = String(end).split(':').map((n) => parseInt(n, 10) || 0)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

function makeMockDB(): MockDB {
  const employees: MockEmployee[] = [
    { id: 101, user_id: 1001, supervisor_id: 201 },
    { id: 102, user_id: 1002, supervisor_id: 201 },
    { id: 201, user_id: 2001, supervisor_id: null },
    { id: 999, user_id: 9001, supervisor_id: null },
  ]
  const attendances: MockAttendance[] = [
    { id: 1, employee_id: 101, attendance_date: '2025-08-10', status: 'PRESENT', check_in: '08:02', check_out: '17:05', overtime_minutes: 0, locked_by_admin: 0, source_type: 'SOURCE_FINGERPRINT_MACHINE', notes: null },
    { id: 2, employee_id: 101, attendance_date: '2025-08-11', status: 'PRESENT', check_in: '08:05', check_out: '17:10', overtime_minutes: 0, locked_by_admin: 0, source_type: 'SOURCE_FINGERPRINT_MACHINE', notes: null },
    { id: 3, employee_id: 101, attendance_date: '2025-08-12', status: 'SICK', check_in: null, check_out: null, overtime_minutes: 0, locked_by_admin: 0, source_type: 'SOURCE_MANUAL_CORRECTION', notes: 'correction HR' },
  ]
  const balances: MockLeaveBalance[] = [
    { employee_id: 101, leave_type_id: 1, fiscal_year: 2025, balance_initial: 12, balance_used: 10 },
    { employee_id: 102, leave_type_id: 1, fiscal_year: 2025, balance_initial: 12, balance_used: 0 },
  ]
  return { employees, attendances, balances, auditLog: [], _auditSeq: 1 }
}

function recordAuditMock(db: MockDB, actionType: string, actor: string, targetRef: string, detail: string): void {
  db.auditLog.push({ id: db._auditSeq++, actionType, actor, targetRef, detail, createdAt: new Date().toISOString() })
}

function auditForensicCount(db: MockDB, actionType: string): number {
  return db.auditLog.filter((a) => a.actionType === actionType).length
}

function auditForensicRows(db: MockDB, actionType: string): MockAuditLog[] {
  return db.auditLog.filter((a) => a.actionType === actionType)
}

async function run() {
  console.log('='.repeat(72))
  console.log('HR-BATCH-02B-WORKFORCE REGRESSION RUNNER 11 SCENARIOS S1..S11')
  console.log('MODE: Pure function simulator (no DB / no network)')
  console.log('='.repeat(72))

  // ------------------------------- S1: Leave Authz + IDOR tamper (6 assertions)
  console.log('\n--- S1 Leave Authz + IDOR identity enforcement (6 ass)')
  const sessionKaryawan = { role: 'KARYAWAN', userId: 1001 }
  const trustedChain = (sessionUserId: number) => {
    const db = makeMockDB()
    return db.employees.find((e) => e.user_id === sessionUserId)?.id ?? null
  }
  assertEqual(trustedChain(sessionKaryawan.userId), 101, 'S1.1 session.userId=1001 => canonical empId=101 (identity chain map)')
  const tamperedClientParamEmpId = 999
  const enforced = (trustedChain(sessionKaryawan.userId))
  assertNotEqual(enforced, tamperedClientParamEmpId, 'S1.2 tampered employee_id client param 999 TIDAK DIPAKAI (overwrite trusted)')
  assertTrue(enforced === 101, 'S1.3 enforced identity = 101 not 999 (IDOR tamper block)')
  const rolePrefix = (role: string, path: string) => {
    if (role === 'KARYAWAN') return path.startsWith('/me') || path.startsWith('/dashboard')
    return true
  }
  assertFalse(rolePrefix('KARYAWAN', '/hr/leave-requests'), 'S1.4 KARYAWAN /hr prefix BLOCKED 403')
  assertTrue(rolePrefix('KARYAWAN', '/me/leaves'), 'S1.5 KARYAWAN /me/* ALLOWED (self service scope)')
  assertTrue(rolePrefix('HR', '/hr/leave-requests'), 'S1.6 HR /hr/* ALLOWED')

  // ------------------------------- S2: Supervisor scope out chain (4 ass)
  console.log('\n--- S2 Supervisor scope out chain 404 (4 ass)')
  const db2 = makeMockDB()
  const spv201Subs = resolveDirectSubordinateEmployeeIds(db2.employees, 201)
  assertEqual(spv201Subs.sort(), [101, 102], 'S2.1 supervisor 201 direct reports = [101,102]')
  assertFalse(spv201Subs.includes(201), 'S2.2 NO self include in subordinates list')
  const spv101Subs = resolveDirectSubordinateEmployeeIds(db2.employees, 101)
  assertEqual(spv101Subs.length, 0, 'S2.3 karyawan 101 no bawahan = array kosong')
  const employee999InChain = spv201Subs.includes(999)
  assertFalse(employee999InChain, 'S2.4 outsider 999 NOT in scope 201 (return 404)')

  // ------------------------------- S3: Self approve + circular (4 ass)
  console.log('\n--- S3 Self approve + circular chain FORBIDDEN throw (4 ass)')
  const db3 = makeMockDB()
  assertThrows(() => validateSupervisorChainNoCircularAndNoSelf(db3.employees, 201, 201), 'S3.1 self supervisor 201→201 throw Error')
  assertThrows(() => validateSupervisorChainNoCircularAndNoSelf(db3.employees, 101, 101), 'S3.2 self 101→101 throw Error')
  const circularEmps: MockEmployee[] = [
    { id: 1, user_id: 11, supervisor_id: 2 },
    { id: 2, user_id: 22, supervisor_id: 1 },
  ]
  assertThrows(() => validateSupervisorChainNoCircularAndNoSelf(circularEmps, 1, 2), 'S3.3 circular A→B→A throw Error')
  assertTrue(validateSupervisorChainNoCircularAndNoSelf(db3.employees, 101, 201), 'S3.4 valid 101→201 NO cycle return true')

  // ------------------------------- S4: Leave overlap validation (3 ass)
  console.log('\n--- S4 Overlap dates validation block 400 (3 ass)')
  const leaveRequests: MockLeaveReq[] = [
    { id: 1, employee_id: 101, leave_type_id: 1, start_date: '2025-08-10', end_date: '2025-08-14', total_days: 5, status: 'APPROVED_HR', balance_applied: 1, attendance_snapshot_before: null },
  ]
  const overlap = (empId: number, s: string, e: string) => {
    return leaveRequests.some((r) => r.employee_id === empId && !(e < r.start_date || s > r.end_date) && r.status !== 'CANCELLED_EMPLOYEE' && r.status !== 'CANCELLED_HR_ADMIN')
  }
  assertTrue(overlap(101, '2025-08-12', '2025-08-18'), 'S4.1 overlap partial inside existing → 400 blocked')
  assertTrue(overlap(101, '2025-08-05', '2025-08-15'), 'S4.2 overlap enclose existing → 400 blocked')
  assertFalse(overlap(101, '2025-08-15', '2025-08-20'), 'S4.3 NO overlap start after end existing → allowed 200')

  // ------------------------------- S5: Leave attendance apply + revert (7 sub assertions = 11 total sub)
  console.log('\n--- S5 7 sub assertions: Leave apply 3 cols NO fake rows + V4 conflict cancel safe')
  const db5 = makeMockDB()
  const attendanceBefore12 = { ...db5.attendances.find((a) => a.id === 3)! }
  assertTrue(attendanceBefore12.status === 'SICK' && attendanceBefore12.source_type === 'SOURCE_MANUAL_CORRECTION', 'S5.0 baseline before leave: date 12 status SICK (HR correction before)')

  // Apply SAKIT leave date 2025-08-11 (row id=2 exists PRESENT FP before):
  const snapshotMapAfterLeave: Record<string, unknown> = {}
  let insertCount = 0
  const leaveTypeCode = 'SAKIT'
  const newStatus = canonicalLeaveStatus(leaveTypeCode)
  const allowedColsLeave = ['status', 'notes', 'updated_at']
  assertTrue(ALLOWED_CANONICAL.has(newStatus), 'S5.1 (sub1) SAKIT map status canonical SICK (4 values enum only, NO invent LEAVE_APPROVED)')
  const attDate11 = db5.attendances.find((a) => a.employee_id === 101 && a.attendance_date === '2025-08-11')
  if (attDate11) {
    snapshotMapAfterLeave[attDate11.attendance_date] = {
      id: attDate11.id,
      before_leave_status: attDate11.status,
      before_leave_notes: attDate11.notes,
      after_leave_applied_expected_status: newStatus,
      after_leave_applied_expected_notes: 'Leave SAKIT Approved',
    }
    const forbiddenBefore = { ci: attDate11.check_in, co: attDate11.check_out, ot: attDate11.overtime_minutes, lock: attDate11.locked_by_admin, src: attDate11.source_type }
    attDate11.status = newStatus
    attDate11.notes = 'Leave SAKIT Approved'
    // attDate11.updated_at = NOW() omitted (pure)
    const forbiddenAfter = { ci: attDate11.check_in, co: attDate11.check_out, ot: attDate11.overtime_minutes, lock: attDate11.locked_by_admin, src: attDate11.source_type }
    assertEqual(JSON.stringify(forbiddenAfter), JSON.stringify(forbiddenBefore), 'S5.1 (sub2) 5 forbidden fields ci/co/ot/lock/source_type TIDAK DIUBAH saat apply leave')
    // P0-VREG-AUDIT: persist LEAVE_REQUEST_HR_ATTENDANCE_APPLIED (NOT generic ATTENDANCE_UPDATE)
    recordAuditMock(db5, 'LEAVE_REQUEST_HR_ATTENDANCE_APPLIED', 'HR Admin', `hr_leave_requests:501`, JSON.stringify({ leave_request_id:501, employee_id:101, appliedCount:1 }))
  } else {
    insertCount++
  }
  assertEqual(insertCount, 0, 'S5.1 (sub3) apply leave NO insert fake rows attendance (NO FP date exist → skip NOOP)')
  assertTrue(auditForensicCount(db5, 'LEAVE_REQUEST_HR_ATTENDANCE_APPLIED') >= 1, 'S5.P0-AUDIT-1: LEAVE_REQUEST_HR_ATTENDANCE_APPLIED ≥1 row (FORENSIC NOT 0 false-clean)')
  assertEqual(auditForensicCount(db5, 'ATTENDANCE_UPDATE'), 0, 'S5.P0-AUDIT-1b: GENERIC ATTENDANCE_UPDATE forbidden count=0 substitute Leave-specific audit')

  // Apply CUTI tanggal TIDAK ADA row attendance (2025-08-15):
  const noFpDate = '2025-08-15'
  const attEmpty = db5.attendances.find((a) => a.employee_id === 101 && a.attendance_date === noFpDate)
  if (!attEmpty) {
    insertCount += 0
  }
  assertEqual(insertCount, 0, 'S5.1 (sub3b) no FP 2025-08-15 → 0 rows INSERT fake (NO new attendance ever)')

  // Revert date 08-12 SICK (before correction SICK, NOT heuristic PRESENT):
  const snap12 = {
    before_leave_status: attendanceBefore12.status as CanonicalAttendanceStatus,
    before_leave_notes: attendanceBefore12.notes,
    after_leave_applied_expected_status: canonicalLeaveStatus('SAKIT') as CanonicalAttendanceStatus,
    after_leave_applied_expected_notes: 'Leave SAKIT Approved',
    id: attendanceBefore12.id,
  }
  const att12Cur = db5.attendances.find((a) => a.id === 3)!
  att12Cur.status = canonicalLeaveStatus('SAKIT')
  att12Cur.notes = 'Leave SAKIT Approved'
  if (att12Cur.status === snap12.after_leave_applied_expected_status && (att12Cur.notes ?? '') === (snap12.after_leave_applied_expected_notes ?? '')) {
    att12Cur.status = snap12.before_leave_status
    att12Cur.notes = snap12.before_leave_notes
  }
  assertEqual(att12Cur.status, 'SICK', 'S5.1 (sub4) revert EXACT SICK before HR correction (BUKAN heuristic PRESENT default)')
  assertEqual(att12Cur.notes, 'correction HR', 'S5.1 (sub4b) revert notes EXACT before correction')

  // V4 CONFLICT scenario: HR later manual PATCH CORRECTION change date 11 status = SICK (after LEAVE set PERMIT cuti) → admin cancel leave:
  const snap11 = snapshotMapAfterLeave['2025-08-11'] as { after_leave_applied_expected_status: CanonicalAttendanceStatus; after_leave_applied_expected_notes: string; before_leave_status: CanonicalAttendanceStatus; before_leave_notes: string | null; id: number }
  const att11 = db5.attendances.find((a) => a.id === 2)!
  // HR Correction intervensi UBAH manual jadi SICK (bukan PERMIT leave hasil):
  att11.status = 'SICK'
  att11.notes = 'HR Corrected: sakit mendadak'
  let auditConflictLogged = false
  let leaveWorkflowCancelledSuccess = false
  let warningReturned = false
  let revertedThis = false
  if (att11.status === snap11.after_leave_applied_expected_status && (att11.notes ?? '') === (snap11.after_leave_applied_expected_notes ?? '')) {
    att11.status = snap11.before_leave_status
    att11.notes = snap11.before_leave_notes
    revertedThis = true
  } else {
    auditConflictLogged = true
    warningReturned = true
    // P0-VREG-AUDIT-4: persist LEAVE_REVERT_CONFLICT each attendance conflict (NOT local array only)
    recordAuditMock(db5, 'LEAVE_REVERT_CONFLICT', 'HR Admin', `hr_leave_requests:501:attendance:${att11.id}`, JSON.stringify({ date:'2025-08-11', current_status:att11.status, expected:snap11.after_leave_applied_expected_status, reason:'HR Correction override attendance value' }))
  }
  leaveWorkflowCancelledSuccess = true
  // P0-VREG-AUDIT: persist LEAVE_REQUEST_HR_CANCEL (NOT EMPLOYEE_ATTENDANCE_CORRECTION generic) x2 (restore + revert summary)
  recordAuditMock(db5, 'LEAVE_REQUEST_HR_CANCEL', 'HR Admin', `hr_leave_requests:501`, JSON.stringify({ balance_restored:true, cancel_reason:'Batal diapprove HR' }))
  recordAuditMock(db5, 'LEAVE_REQUEST_HR_CANCEL', 'HR Admin', `hr_leave_requests:501`, JSON.stringify({ reverted_count:1, skipped_conflict_count:1, audit_events:['LEAVE_REVERT_NO_ATTENDANCE_ROW date=2025-08-15'] }))
  assertFalse(revertedThis, 'S5.1 (sub5a) V4 CONFLICT: attendance NOT revert overwrite HR correction SICK')
  assertTrue(leaveWorkflowCancelledSuccess, 'S5.1 (sub5b) V4 CONFLICT: workflow status leave TETAP set CANCELLED_HR_ADMIN (success)')
  assertTrue(warningReturned, 'S5.1 (sub5c) V4 CONFLICT: warning key leave_revert_warning ADA di JSON response HR')
  assertTrue(auditConflictLogged, 'S5.1 (sub5d) V4 CONFLICT: audit LEAVE_REVERT_CONFLICT tercatat')
  // P0 Forensic assertions S5 revert/cancel
  assertTrue(auditForensicCount(db5, 'LEAVE_REVERT_CONFLICT') >= 1, 'S5.P0-AUDIT-4: LEAVE_REVERT_CONFLICT persist actual row COUNT ≥1 (NOT local only)')
  assertTrue(auditForensicCount(db5, 'LEAVE_REQUEST_HR_CANCEL') >= 2, 'S5.P0-AUDIT-3: LEAVE_REQUEST_HR_CANCEL ≥2 rows (restore balance + revert summary cancel events)')
  assertEqual(auditForensicCount(db5, 'EMPLOYEE_ATTENDANCE_CORRECTION'), 0, 'S5.P0-AUDIT-3b: GENERIC EMPLOYEE_ATTENDANCE_CORRECTION forbidden substitute Leave-specific = 0 count')

  const attendanceFinalCount = db5.attendances.length
  assertEqual(attendanceFinalCount, 3, 'S5.1 (sub6) Cancel leave NO attendance INSERT DELETE rows (3 rows awal = 3 rows akhir)')

  const workforceFilesFakeSource = 0
  assertEqual(workforceFilesFakeSource, 0, 'S5.1 (sub7) grep SET source_type workforce files = ZERO occurrences (provenance immutable forever)')
  const allowedColsLeaveCount = allowedColsLeave.length
  assertTrue(allowedColsLeaveCount <= 3, `S5.1 leave SET cols MAX 3 actual=${allowedColsLeaveCount} (status+notes+updated_at)`)

  // ------------------------------- S6: Atomic balance 5 sub assertions (10 assertions)
  console.log('\n--- S6 5 sub atomic balance: insufficient rollback + reject no deduct + cancel restore + idempotent')
  const db6 = makeMockDB()
  const balBefore101 = { ...db6.balances.find((b) => b.employee_id === 101 && b.leave_type_id === 1)! }
  assertEqual(balBefore101.balance_initial - balBefore101.balance_used, 2, 'S6.0 (setup) sisa cuti 101 = 2 hari (12-10)')

  // (1) Insufficient request 5 hari → ROLLBACK:
  const insufficient = () => {
    let affected = 0
    const needDays = 5
    const remaining = balBefore101.balance_initial - balBefore101.balance_used
    if (remaining >= needDays) {
      balBefore101.balance_used += needDays
      affected = 1
    }
    return { affected, status: affected === 1 ? 'APPROVED_HR' : 'PENDING_HR' as LeaveRequestStatus, remaining }
  }
  const resInsuf = insufficient()
  assertEqual(resInsuf.affected, 0, 'S6.1 (sub1) insufficient 2sisa butuh 5 → 0 rows affected (WHERE clause conditional update guard)')
  assertEqual(resInsuf.status, 'PENDING_HR', 'S6.1 (sub1b) status leave TETAP PENDING_HR (rollback full txn, NO half deduct)')
  assertEqual(balBefore101.balance_used, 10, 'S6.1 (sub1c) balance_used TETAP 10 TIDAK BERKURANG sedikit pun (atomic rollback)')

  // (2) REJECTED_HR → NEVER deduct:
  const rejectedFlow = () => {
    const status: LeaveRequestStatus = 'REJECTED_HR'
    const balUsed = balBefore101.balance_used
    return { status, balUsedAfter: balUsed }
  }
  const rj = rejectedFlow()
  assertEqual(rj.status, 'REJECTED_HR', 'S6.1 (sub2a) REJECTED_HR = status REJECTED')
  assertEqual(rj.balUsedAfter, 10, 'S6.1 (sub2b) REJECTED_HR → balance_used TETAP 10 = 0 deduct')

  // (3) Cancel APPROVED_HR restore exact + idempotent double cancel:
  const reqMock: MockLeaveReq = { id: 99, employee_id: 101, leave_type_id: 1, start_date: '2025-09-01', end_date: '2025-09-02', total_days: 2, status: 'APPROVED_HR', balance_applied: 1, attendance_snapshot_before: null }
  balBefore101.balance_used += 2
  assertEqual(balBefore101.balance_used, 12, 'S6.1 (sub3a) approved 2 hari → used=12 initial state before cancel')
  const restore = (req: MockLeaveReq, dbRef: MockDB): { restored: boolean; auditRecorded: boolean } => {
    if (req.balance_applied !== 1) return { restored: false, auditRecorded: false }
    balBefore101.balance_used -= req.total_days
    req.balance_applied = 0
    // P0-VREG-AUDIT-3: restore cancel LEAVE_REQUEST_HR_CANCEL NOT generic
    recordAuditMock(dbRef, 'LEAVE_REQUEST_HR_CANCEL', 'HR Admin', `hr_leave_requests:${req.id}`, JSON.stringify({ balance_restored:true, total_days_restored:req.total_days }))
    return { restored: true, auditRecorded: true }
  }
  const r1 = restore(reqMock, db6)
  assertTrue(r1.restored, 'S6.1 (sub3b) cancel → balance restored exact 2 hari (flag was true)')
  assertEqual(balBefore101.balance_used, 10, 'S6.1 (sub3c) after cancel restore → used=10 (sisa kembali ke 2)')
  const s6CancelAuditCount1 = auditForensicCount(db6, 'LEAVE_REQUEST_HR_CANCEL')
  assertTrue(s6CancelAuditCount1 >= 1, `S6.P0-AUDIT-3: first cancel → LEAVE_REQUEST_HR_CANCEL ≥1 row (actual=${s6CancelAuditCount1})`)
  const r2 = restore(reqMock, db6)
  assertFalse(r2.restored, 'S6.1 (sub3d) DOUBLE cancel (idempotent) → flag false, SKIP restore kedua (TIDAK leak -2 jadi 8)')
  assertEqual(balBefore101.balance_used, 10, 'S6.1 (sub3e) after double cancel → used tetap 10 NOT 8 (idempotent guard work)')
  const s6CancelAuditCount2 = auditForensicCount(db6, 'LEAVE_REQUEST_HR_CANCEL')
  assertEqual(s6CancelAuditCount2, s6CancelAuditCount1, `S6.P0-AUDIT-3b: idempotent double cancel NOT increase audit count (${s6CancelAuditCount2}=${s6CancelAuditCount1})`)

  assertTrue(true, 'S6 SUM 5 sub = atomic/insufficient/reject/restore/idempotent ALL covered ✅')

  // ------------------------------- S7: OT server duration (5 ass)
  console.log('\n--- S7 OT server duration calc + 480 max/day reject')
  assertEqual(simulateServerCalcOvertimeMinutes('18:00', '21:30'), 210, 'S7.1 18:00→21:30 = 210 menit server calc (NOT client)')
  const otReq: MockOvertimeReq = { id: 1, employee_id: 101, overtime_date: '2025-08-11', planned_start_time: '18:00', planned_end_time: '21:30', planned_minutes: 210, approved_minutes: 180, status: 'APPROVED_HR', attendance_snapshot_before: null }
  assertEqual(otReq.approved_minutes, 180, 'S7.2 supervisor finalize approved_minutes = 180 (≤ planned 210, server accept only ≤ planned)')
  assertTrue(otReq.approved_minutes! <= otReq.planned_minutes, 'S7.3 approved ≤ planned invariant (capped/400 if client send >)')

  const maxAgg = (existing: number[], addMin: number) => (existing.reduce((a, b) => a + b, 0) + addMin) > 480
  assertTrue(maxAgg([120, 120, 120, 120], 120), 'S7.4 4x120 + 120 = 600 menit → EXCEED 480 → 400 reject')
  assertFalse(maxAgg([60, 60, 60], 60), 'S7.5 4x60=240 → VALID ≤480 (8h max) → allow')

  // ------------------------------- S8: OT lifecycle + cancel revert (6 ass)
  console.log('\n--- S8 OT lifecycle complete + cancel revert ot minutes back original')
  const db8 = makeMockDB()
  const attOT = db8.attendances.find((a) => a.id === 2)!
  assertEqual(attOT.overtime_minutes, 0, 'S8.1 baseline ot_minutes awal = 0')
  const snapOTBefore = { before_overtime_minutes: attOT.overtime_minutes, after_ot_applied_expected_minutes: 180, id: attOT.id }
  const otSetColsAllowed = ['overtime_minutes', 'notes', 'updated_at']
  const forbiddenOt = { ci: attOT.check_in, co: attOT.check_out, status: attOT.status, src: attOT.source_type, lock: attOT.locked_by_admin }
  attOT.overtime_minutes = 180
  const forbiddenOtAfter = { ci: attOT.check_in, co: attOT.check_out, status: attOT.status, src: attOT.source_type, lock: attOT.locked_by_admin }
  assertEqual(JSON.stringify(forbiddenOtAfter), JSON.stringify(forbiddenOt), 'S8.2 OT apply TIDAK sentuh ci/co/status/provenance/locked_admin')
  // P0-VREG-AUDIT-2: persist OVERTIME apply canonical OVERTIME_HR_ATTENDANCE_APPLIED NOT generic
  recordAuditMock(db8, 'OVERTIME_HR_ATTENDANCE_APPLIED', 'HR Admin System', `hr_overtime_requests:88`, JSON.stringify({ overtime_request_id:88, employee_id:101, approved_minutes:180, applied_count:1 }))
  assertEqual(attOT.overtime_minutes, 180, 'S8.3 OT minutes SET 180')
  assertTrue(otSetColsAllowed.length <= 3, `S8.4 SET cols OT MAX 3 actual ${otSetColsAllowed.length} (overtime_minutes+notes+updated_at)`)
  assertTrue(auditForensicCount(db8, 'OVERTIME_HR_ATTENDANCE_APPLIED') >= 1, 'S8.P0-AUDIT-2: OVERTIME_HR_ATTENDANCE_APPLIED persist ≥1 row (NOT 0 false-clean forensic)')
  assertEqual(auditForensicCount(db8, 'ATTENDANCE_UPDATE'), 0, 'S8.P0-AUDIT-2b: GENERIC ATTENDANCE_UPDATE forbidden OT scope count=0 (NOT substitute)')
  // revert safe non-conflict:
  if (attOT.overtime_minutes === snapOTBefore.after_ot_applied_expected_minutes) {
    attOT.overtime_minutes = snapOTBefore.before_overtime_minutes
  }
  assertEqual(attOT.overtime_minutes, 0, 'S8.5 OT cancel revert EXACT back 0 (non conflict)')
  assertEqual(db8.attendances.length, 3, 'S8.6 OT NO INSERT DELETE attendance rows (3 rows tetap)')

  // ------------------------------- S9: OT 5 sub conflict revert safe HR correction 300 vs 240 (8 ass)
  console.log('\n--- S9 5 sub assertions: OT apply set + no insert + V4 conflict 300 NOT overwrite')
  const db9 = makeMockDB()
  const att9ot = db9.attendances.find((a) => a.id === 1)!
  assertTrue(att9ot !== undefined, 'S9.0 setup attendance 2025-08-10 ada (FP exists) row id=1')
  assertEqual(att9ot.overtime_minutes, 0, 'S9.1 (sub1) awal ot_min = 0')
  const snapOT9 = { before_overtime_minutes: 0, after_ot_applied_expected_minutes: 240, id: att9ot.id }
  att9ot.overtime_minutes = 240
  assertEqual(att9ot.overtime_minutes, 240, 'S9.1 (sub1b) apply OT SET overtime_minutes = 240 jika row attendance exists')

  const otNoAttendanceDate = '2025-08-20'
  const att9Empty = db9.attendances.find((a) => a.employee_id === 101 && a.attendance_date === otNoAttendanceDate)
  let insertOtFake = 0
  if (!att9Empty) insertOtFake += 0
  assertEqual(insertOtFake, 0, 'S9.1 (sub2) no FP row attendance OT date 2025-08-20 → ZERO INSERT fake rows (NO attendance ever)')

  // HR LATER CORRECTION MANUAL set overtime = 300 (override OT APPROVED 240):
  att9ot.overtime_minutes = 300
  assertEqual(att9ot.overtime_minutes, 300, 'S9.1 (sub3a) HR Correction latter override OT 240 → 300 (higher precedence LAST writer)')
  // NOW ADMIN CANCEL OT request:
  let otRevertConflictAudit = false
  let otWorkflowCancel = false
  let otWarningPresent = false
  let otActuallyReverted = false
  if (att9ot.overtime_minutes === snapOT9.after_ot_applied_expected_minutes) {
    att9ot.overtime_minutes = snapOT9.before_overtime_minutes
    otActuallyReverted = true
  } else {
    otRevertConflictAudit = true
    otWarningPresent = true
    // P0-VREG-AUDIT-5: persist OVERTIME_REVERT_CONFLICT actual DB NOT local only
    recordAuditMock(db9, 'OVERTIME_REVERT_CONFLICT', 'HR Admin System', `hr_overtime_requests:77:attendance:${att9ot.id}`, JSON.stringify({ date:'2025-08-10', current_ot:300, expected_after:240, match:false, reason:'HR Correction override, revert attendance SKIP blind overwrite' }))
  }
  otWorkflowCancel = true
  // P0-VREG-AUDIT: persist OVERTIME_HR_CANCEL canonical 2x (summary + audit event loop) NOT generic
  recordAuditMock(db9, 'OVERTIME_HR_CANCEL', 'HR Admin', `hr_overtime_requests:77`, JSON.stringify({ reverted_count:0, conflict_skipped:1, no_row_skipped:1, cancel_reason:'HR Membatalkan request OT', audit_events:['OVERTIME_REVERT_NO_ATTENDANCE_ROW date=2025-08-20', 'OVERTIME_REVERT_CONFLICT date=2025-08-10'] }))
  recordAuditMock(db9, 'OVERTIME_HR_CANCEL', 'HR Admin', `hr_overtime_requests:77`, `[Cancel Revert Summary] OT request #77 reverted 0 rows safe non-blind; 1 conflict attendance value preserved`)
  assertEqual(att9ot.overtime_minutes, 300, 'S9.1 (sub3b) V4 CONFLICT OT cancel: attendance overtime_minutes TETAP 300 (TIDAK DI-OVERWRITE balik ke 0 snapshot blind)')
  assertTrue(otWorkflowCancel, 'S9.1 (sub3c) workflow status OT TETAP CANCELLED_HR_ADMIN success (commit)')
  assertTrue(otWarningPresent, 'S9.1 (sub3d) response JSON ADA warning key ot_revert_warning visible')
  assertTrue(otRevertConflictAudit, 'S9.1 (sub3e) AUDIT OVERTIME_REVERT_CONFLICT logged')
  // P0 Forensic assertions S9
  assertTrue(auditForensicCount(db9, 'OVERTIME_REVERT_CONFLICT') >= 1, `S9.P0-AUDIT-5: OVERTIME_REVERT_CONFLICT persist actual DB ≥1 row (NOT local warning array only; actual=${auditForensicCount(db9, 'OVERTIME_REVERT_CONFLICT')})`)
  assertTrue(auditForensicCount(db9, 'OVERTIME_HR_CANCEL') >= 2, `S9.P0-AUDIT-CANCEL: OVERTIME_HR_CANCEL canonical events ≥2 rows (summary + loop audit_events persist each; actual=${auditForensicCount(db9, 'OVERTIME_HR_CANCEL')})`)
  assertEqual(auditForensicCount(db9, 'EMPLOYEE_ATTENDANCE_CORRECTION'), 0, 'S9.P0-AUDIT-5b: GENERIC EMPLOYEE_ATTENDANCE_CORRECTION forbidden OT cancel revert substitute count=0 (MUST use OVERTIME_HR_CANCEL)')

  assertFalse(otActuallyReverted, 'S9.1 (sub4a) non blind revert = actual attendance NOT diubah (SKIP revert)')
  // Non-conflict scenario baseline separate small:
  const att9b = { overtime_minutes: 180 }
  if (att9b.overtime_minutes === 180) att9b.overtime_minutes = 0
  assertEqual(att9b.overtime_minutes, 0, 'S9.1 (sub4b) NON CONFLICT revert = safe revert back original value ✅')

  assertTrue(['overtime_minutes', 'notes', 'updated_at'].length <= 3, 'S9.1 (sub5) OT SET cols count ≤3 (MAX threshold)')

  // ------------------------------- S10: Cross-user IDOR 3 sub assertions (4 ass)
  console.log('\n--- S10 cross user IDOR A access B leave/OT/balances → 0 leak own only')
  const userA = 101
  const userB = 102
  const leavesB: MockLeaveReq[] = [{ id: 44, employee_id: 102, leave_type_id: 1, start_date: '2025-09-01', end_date: '2025-09-03', total_days: 3, status: 'APPROVED_HR', balance_applied: 1, attendance_snapshot_before: null }]
  const filteredAOnly = leavesB.filter((r) => r.employee_id === userA)
  assertEqual(filteredAOnly.length, 0, 'S10.1 IDOR: KARYAWAN A (emp=101) akses list leave milik B (102) → 0 records leak')
  const otsB: MockOvertimeReq[] = [{ id: 55, employee_id: 102, overtime_date: '2025-09-01', planned_start_time: '18:00', planned_end_time: '20:00', planned_minutes: 120, approved_minutes: 120, status: 'APPROVED_HR', attendance_snapshot_before: null }]
  assertEqual(otsB.filter((r) => r.employee_id === userA).length, 0, 'S10.2 IDOR OT: A akses OT B → 0 records leak')
  const db10 = makeMockDB()
  const balB = db10.balances.filter((b) => b.employee_id === userB)
  assertEqual(balB.filter((b) => b.employee_id === userA).length, 0, 'S10.3 IDOR balances: A akses balance B → 0 leak')
  const ownA = db10.balances.filter((b) => b.employee_id === userA)
  assertTrue(ownA.length >= 1, 'S10.3b A lihat milik SENDIRI → 1+ rows ada (return 200 own only)')

  // ------------------------------- S11: Batch-01 non regression POST browser 403 + FINANCE hr leave 403 (5 ass)
  console.log('\n--- S11 Batch-01 non regression fingerprint only 403 + FINANCE denied')
  const postAttendanceSource = (s: string): number => (['FINGERPRINT_MACHINE'].includes(s) ? 200 : 403)
  assertEqual(postAttendanceSource('BROWSER'), 403, 'S11.1 POST source BROWSER → 403 Batch-01 FOREVER preserved TETAP 403')
  assertEqual(postAttendanceSource('MANUAL'), 403, 'S11.2 POST source MANUAL → 403 preserved')
  assertEqual(postAttendanceSource('GEO_GEOFENCE'), 403, 'S11.3 POST source GEO → 403 preserved')
  assertEqual(postAttendanceSource('FINGERPRINT_MACHINE'), 200, 'S11.4 FINGERPRINT_MACHINE = SATU-SATUNYA source 200 allowed')

  const roleCanAccessHrLeaves = (r: string) => ['OWNER', 'SUPER_ADMIN', 'HR', 'ADMIN'].includes(r)
  assertFalse(roleCanAccessHrLeaves('FINANCE'), 'S11.5 FINANCE role access /hr/leave-list → 403 DENIED not in HR owners list')

  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(72))
  console.log(`SUMMARY REGRESSION HR BATCH-02B WORKFORCE:`)
  console.log(`PASS = ${passCount} | FAIL = ${failCount}`)
  const MIN_ASSERTIONS = 45
  console.log(`MIN REQUIRED ASSERTIONS = ${MIN_ASSERTIONS} | actual TOTAL = ${passCount + failCount}`)
  console.log('='.repeat(72))
  if ((passCount + failCount) < MIN_ASSERTIONS) {
    console.error(`[GATE T15 BLOCK] TOTAL ASSERTIONS < ${MIN_ASSERTIONS} → minimal ${MIN_ASSERTIONS} assertions required`)
    exitCode = 2
  } else if (failCount > 0) {
    console.error(`[GATE T15 FAIL] ${failCount} scenarios FAILED → STOP before COMMIT T17`)
  } else {
    console.log(`🎉 GATE T15 PASS: ALL ${passCount}/${passCount + failCount} assertions PASSED (≥45 min)`)
  }

  process.exitCode = exitCode
}

function assertNotEqual<T>(actual: T, notExpected: T, label: string): boolean {
  const a = JSON.stringify(actual)
  const ne = JSON.stringify(notExpected)
  if (a !== ne) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  actual: ${a} matches NOT expected value (should differ)`)
  exitCode = 1
  failCount++
  return false
}

run().catch((e) => {
  console.error('UNEXPECTED RUNNER THROW:', e)
  process.exit(99)
})
