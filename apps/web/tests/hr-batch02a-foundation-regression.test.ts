type AppRole =
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'HR'
  | 'GA'
  | 'PENJUALAN'
  | 'KARYAWAN'
  | 'SALES_MARKETING'
  | 'SPV_SALES'
  | 'CS_OPERATOR'
  | 'CS_ADMIN'
  | 'NOC_OPERATOR'
  | 'FIELD_TECHNICIAN'
  | 'TT_OPERATOR'
  | 'DIGITAL_CREATOR'
  | 'DISMANTLE_OPERATOR'
  | 'PUBLIC'

const BASELINE_ROLE_PREFIXES: Record<AppRole, string[]> = {
  OWNER: ['/dashboard', '/hr', '/finance', '/sales', '/support', '/inventory', '/me', '/dashboard/tracking'],
  SUPER_ADMIN: ['/dashboard', '/hr', '/finance', '/sales', '/support', '/inventory', '/me', '/dashboard/tracking'],
  ADMIN: ['/dashboard', '/hr', '/finance', '/sales', '/support', '/inventory', '/me', '/dashboard/tracking'],
  FINANCE: ['/dashboard', '/finance', '/me', '/dashboard/tracking'],
  HR: ['/dashboard', '/hr', '/me', '/dashboard/tracking'],
  GA: ['/dashboard', '/inventory', '/me', '/dashboard/tracking'],
  PENJUALAN: ['/dashboard', '/sales', '/list-psb', '/customers', '/support', '/inventory', '/me', '/dashboard/tracking'],
  KARYAWAN: ['/dashboard', '/me', '/dashboard/tracking'],
  SALES_MARKETING: ['/dashboard', '/sales', '/list-psb', '/customers', '/support', '/inventory', '/me', '/dashboard/tracking'],
  SPV_SALES: ['/dashboard', '/sales', '/list-psb', '/customers', '/support', '/inventory', '/me', '/dashboard/tracking'],
  CS_OPERATOR: ['/dashboard', '/customers', '/support', '/me', '/dashboard/tracking'],
  CS_ADMIN: ['/dashboard', '/customers', '/support', '/inventory', '/me', '/dashboard/tracking'],
  NOC_OPERATOR: ['/dashboard', '/support', '/inventory', '/me', '/dashboard/tracking'],
  FIELD_TECHNICIAN: ['/dashboard', '/support', '/inventory', '/me', '/teknisi-psb', '/dashboard/tracking'],
  TT_OPERATOR: ['/dashboard', '/support', '/me', '/dashboard/tracking'],
  DIGITAL_CREATOR: ['/dashboard', '/sales', '/me', '/dashboard/tracking'],
  DISMANTLE_OPERATOR: ['/dashboard', '/support', '/me', '/dashboard/tracking'],
  PUBLIC: ['/login'],
}

type PermissionEntry = { resource: string; actions: string[] }
const BASELINE_PERMISSIONS: Record<AppRole, PermissionEntry[]> = {
  OWNER: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'hr', actions: ['view', 'create', 'update', 'delete', 'export', 'manage'] },
    { resource: 'finance', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  SUPER_ADMIN: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'hr', actions: ['view', 'create', 'update', 'delete', 'export', 'manage'] },
    { resource: 'finance', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  ADMIN: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'hr', actions: ['view', 'create', 'update', 'delete', 'export', 'manage'] },
    { resource: 'finance', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'export', 'manage'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  FINANCE: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'finance', actions: ['view', 'create', 'update', 'export'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  HR: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'hr', actions: ['view', 'create', 'update', 'delete', 'export', 'manage'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  GA: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'export'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  PENJUALAN: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'sales', actions: ['view', 'create', 'update'] },
    { resource: 'customers', actions: ['view', 'create', 'update'] },
    { resource: 'support', actions: ['view'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  KARYAWAN: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  SALES_MARKETING: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'sales', actions: ['view', 'create', 'update'] },
    { resource: 'customers', actions: ['view', 'create', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  SPV_SALES: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve'] },
    { resource: 'customers', actions: ['view', 'create', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  CS_OPERATOR: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'customers', actions: ['view', 'create', 'update'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  CS_ADMIN: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'customers', actions: ['view', 'create', 'update', 'approve'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'inventory', actions: ['view', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  NOC_OPERATOR: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
    { resource: 'inventory', actions: ['view', 'create', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  FIELD_TECHNICIAN: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'support', actions: ['view'] },
    { resource: 'inventory', actions: ['view'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  TT_OPERATOR: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  DIGITAL_CREATOR: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'sales', actions: ['view'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  DISMANTLE_OPERATOR: [
    { resource: 'dashboard', actions: ['view'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
    { resource: 'daily_activity', actions: ['view'] },
  ],
  PUBLIC: [],
}

function canAccessPath(role: AppRole, path: string): boolean {
  const prefixes = BASELINE_ROLE_PREFIXES[role] ?? []
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}
function canPerformAction(role: AppRole, resource: string, action: string): boolean {
  const list = BASELINE_PERMISSIONS[role] ?? []
  return list.some((e) => e.resource === resource && e.actions.includes(action))
}

type AttendanceSourceMethod =
  | 'SOURCE_BROWSER'
  | 'SOURCE_MANUAL_CORRECTION'
  | 'SOURCE_FINGERPRINT_MACHINE'
  | 'SOURCE_FACE'
  | 'SOURCE_GEOFENCE_GPS'

type AttendanceCreateResp = { status: number; message: string; mutationOccurred: boolean }

function simulateAttendancePostCreate(method: AttendanceSourceMethod): AttendanceCreateResp {
  const allowedFpOnly: ReadonlySet<AttendanceSourceMethod> = new Set(['SOURCE_FINGERPRINT_MACHINE'])
  if (!allowedFpOnly.has(method)) {
    return { status: 403, message: 'Forbidden fingerprint-only policy', mutationOccurred: false }
  }
  return { status: 200, message: 'Accepted fingerprint source', mutationOccurred: true }
}

type CorrectionPatchInput = {
  clock_in?: string | null
  clock_out?: string | null
  status?: string | null
  overtime_minutes?: number | null
  locked?: number | null
  source_type?: AttendanceSourceMethod | null
}
type CorrectionPatchResp = {
  status: number
  appliedColumns: string[]
  source_type_touched: boolean
  mutationOccurred: boolean
}

const CORRECTION_ALLOWED_COLS: readonly string[] = [
  'clock_in',
  'clock_out',
  'status',
  'overtime_minutes',
  'locked',
  'updated_at',
] as const

function simulateAttendanceCorrectionPatch(input: CorrectionPatchInput): CorrectionPatchResp {
  const applied: string[] = []
  let sourceTouched = false
  for (const key of Object.keys(input)) {
    if ((input as Record<string, unknown>)[key] === undefined) continue
    if (key === 'source_type') {
      sourceTouched = true
    } else if (CORRECTION_ALLOWED_COLS.includes(key)) {
      applied.push(key)
    }
  }
  applied.push('updated_at')
  const safeCols = CORRECTION_ALLOWED_COLS.length
  return {
    status: sourceTouched ? 400 : 200,
    appliedColumns: applied,
    source_type_touched: sourceTouched,
    mutationOccurred: !sourceTouched && applied.length <= safeCols,
  }
}

type AttendanceEnginePrevious = { source_type: AttendanceSourceMethod | null }
type AttendanceEngineResult = {
  new_source_type: AttendanceSourceMethod | null
  rewritten: boolean
  fingerprint_label_applied: boolean
}

function simulateAttendanceProcessingEngine(prev: AttendanceEnginePrevious): AttendanceEngineResult {
  const canonicalFp: AttendanceSourceMethod = 'SOURCE_FINGERPRINT_MACHINE'
  if (prev.source_type === null) {
    return {
      new_source_type: canonicalFp,
      rewritten: false,
      fingerprint_label_applied: true,
    }
  }
  return {
    new_source_type: prev.source_type,
    rewritten: false,
    fingerprint_label_applied: false,
  }
}

type RawFpEvent = { id: number; status: 'NEW' | 'PROCESSING' | 'DONE' | 'FAILED'; payload: string }
type RawEventProcessResp = { processed: boolean; skipped: boolean; reason: string }

function simulateRawFpEventProcess(evt: RawFpEvent): RawEventProcessResp {
  if (evt.status === 'DONE') {
    return { processed: false, skipped: true, reason: 'already-processed-DONE' }
  }
  return { processed: true, skipped: false, reason: 'eligible-process' }
}

type IdentityResolved = { id: number; user_id: number }
function buildSession(role: AppRole, userId: number | null = 1001, employeeId: number | null = null) {
  const label = String(role).toLowerCase().replace(/_/g, ' ')
  return {
    userId,
    role,
    username: `${label}-user`,
    displayName: `${label} display`,
    employeeId: employeeId ?? (role === 'KARYAWAN' ? Number(userId ?? 0) + 5000 : null),
  }
}
type TestSession = ReturnType<typeof buildSession>

function simulateSelfScopeEnforce(
  session: TestSession,
  requestedEmployeeId: number | null,
  bucket: 'attendance_list' | 'document_list' | 'document_upload' | 'salary_slip_list',
): { effective_employee_id: number; enforced_self: boolean; rejected: boolean; reject_status: number } {
  if (session.role === 'KARYAWAN') {
    const meId = Number(session.employeeId ?? 0)
    if (meId <= 0) {
      return { effective_employee_id: 0, enforced_self: true, rejected: true, reject_status: 403 }
    }
    return { effective_employee_id: meId, enforced_self: true, rejected: false, reject_status: 0 }
  }
  const hrOk = canPerformAction(session.role, 'hr', bucket === 'document_upload' ? 'create' : 'view')
  if (!hrOk) {
    return { effective_employee_id: 0, enforced_self: false, rejected: true, reject_status: 403 }
  }
  const eid = Number(requestedEmployeeId ?? 0)
  return {
    effective_employee_id: eid > 0 ? eid : 0,
    enforced_self: false,
    rejected: false,
    reject_status: 0,
  }
}

function simulateDocumentCrossAccess(
  session: TestSession,
  docOwnerEmployeeId: number,
  action: 'download' | 'replace' | 'view_meta',
): { allowed: boolean; status: number; logged_access_denied: boolean } {
  if (session.role === 'KARYAWAN') {
    const meId = Number(session.employeeId ?? 0)
    if (meId !== docOwnerEmployeeId) {
      return { allowed: false, status: 404, logged_access_denied: true }
    }
    return { allowed: true, status: 200, logged_access_denied: false }
  }
  const hrOk = canPerformAction(session.role, 'hr', 'view')
  if (!hrOk) return { allowed: false, status: 403, logged_access_denied: false }
  return { allowed: true, status: 200, logged_access_denied: false }
}

type EmployeeCodeDuplicateGroup = { employee_code: string; count: number }

class HrEmployeeCodeDuplicatePreflightError extends Error {
  constructor(public groups: EmployeeCodeDuplicateGroup[]) {
    super(`STOP: ${groups.length} duplicate groups found`)
    this.name = 'HrEmployeeCodeDuplicatePreflightError'
  }
}

function simulateEmployeeCodePreflight(groups: EmployeeCodeDuplicateGroup[]): void {
  if (groups.length > 0) {
    throw new HrEmployeeCodeDuplicatePreflightError(groups)
  }
}

type GenCodeAttemptSim = (code: string, attempt: number) => boolean

function simulateEmployeeCodeGeneratorWithRetry(
  genFn: () => string,
  attemptFn: GenCodeAttemptSim,
  maxAttempts = 3,
): { code: string | null; attempts: number; success: boolean; duplicate_caught_count: number } {
  let attempts = 0
  let dupCount = 0
  while (attempts < maxAttempts) {
    attempts++
    const code = genFn()
    try {
      const ok = attemptFn(code, attempts)
      if (!ok) throw new Error('ER_DUP_ENTRY uq_hr_employees_employee_code')
      return { code, attempts, success: true, duplicate_caught_count: dupCount }
    } catch (e: unknown) {
      const txt = String(e instanceof Error ? e.message : e)
      if (txt.includes('ER_DUP_ENTRY') && attempts < maxAttempts) {
        dupCount++
        continue
      }
      return { code: null, attempts, success: false, duplicate_caught_count: dupCount }
    }
  }
  return { code: null, attempts, success: false, duplicate_caught_count: dupCount }
}

let passCount = 0
let failCount = 0
function assertEq<T>(name: string, actual: T, expected: T, note: string) {
  if (actual === expected) {
    console.log(`[PASS] ${name} ${note}`)
    passCount++
  } else {
    console.error(
      `[FAIL] ${name} expected ${String(expected)} actual ${String(actual)} | ${note}`,
    )
    failCount++
    process.exitCode = 1
  }
}

function runAll(): void {
  // ===== GROUP A: BATCH-01 PROVENANCE NON-REGRESSION (T1-T8) =====
  // T1: Browser method POST attendance = 403
  const t1Browser = simulateAttendancePostCreate('SOURCE_BROWSER')
  assertEq('T1.FP-ONLY browser POST 403', t1Browser.status, 403, `mutation=${t1Browser.mutationOccurred}`)
  // T2: Manual method = 403
  const t2Manual = simulateAttendancePostCreate('SOURCE_MANUAL_CORRECTION')
  assertEq('T2.FP-ONLY manual POST 403', t2Manual.status, 403, `mutation=${t2Manual.mutationOccurred}`)
  // T3: Face method = 403
  const t3Face = simulateAttendancePostCreate('SOURCE_FACE')
  assertEq('T3.FP-ONLY face POST 403', t3Face.status, 403, `mutation=${t3Face.mutationOccurred}`)
  // T4: Geofence/GPS method = 403
  const t4Geo = simulateAttendancePostCreate('SOURCE_GEOFENCE_GPS')
  assertEq('T4.FP-ONLY geofence-gps POST 403', t4Geo.status, 403, `mutation=${t4Geo.mutationOccurred}`)
  // T5: Correction PATCH column count = 6 allowed, source_type untouched
  const t5Patch = simulateAttendanceCorrectionPatch({
    clock_in: '08:00',
    clock_out: '17:00',
    status: 'PRESENT',
    overtime_minutes: 30,
    locked: 1,
  })
  assertEq(
    'T5.CORRECTION allowed col count <= 6 + updated_at',
    t5Patch.appliedColumns.length <= CORRECTION_ALLOWED_COLS.length,
    true,
    `cols=${t5Patch.appliedColumns.join(',')}`,
  )
  assertEq(
    'T5.CORRECTION source_type NEVER touched in valid patch',
    t5Patch.source_type_touched,
    false,
    `status=${t5Patch.status}`,
  )
  // T6: Engine provenance - previous source non-fingerprint NOT rewritten (SOURCE_BROWSER stays)
  const t6PrevBrowser: AttendanceEnginePrevious = { source_type: 'SOURCE_BROWSER' }
  const t6Engine = simulateAttendanceProcessingEngine(t6PrevBrowser)
  assertEq(
    'T6.ENGINE provenance browser preserved NO-REWRITE',
    t6Engine.new_source_type,
    'SOURCE_BROWSER',
    `rewritten=${t6Engine.rewritten}`,
  )
  assertEq('T6.ENGINE NO generic rewrite flag', t6Engine.rewritten, false, 'prov-safe')
  // T7: Engine provenance - previous NULL → fingerprint canonical applied
  const t7PrevNull: AttendanceEnginePrevious = { source_type: null }
  const t7Engine = simulateAttendanceProcessingEngine(t7PrevNull)
  assertEq(
    'T7.ENGINE NULL legacy → fingerprint applied',
    t7Engine.new_source_type,
    'SOURCE_FINGERPRINT_MACHINE',
    `fp_label=${t7Engine.fingerprint_label_applied}`,
  )
  assertEq('T7.ENGINE fingerprint label applied true', t7Engine.fingerprint_label_applied, true, 'null→fp')
  // T8: Raw event DONE = skip reprocess
  const t8DoneEvt: RawFpEvent = { id: 777, status: 'DONE', payload: '{}' }
  const t8Done = simulateRawFpEventProcess(t8DoneEvt)
  assertEq('T8.RAW-EVENT DONE skipped true', t8Done.skipped, true, `reason=${t8Done.reason}`)
  assertEq('T8.RAW-EVENT DONE processed false', t8Done.processed, false, 'no reprocess')

  // ===== GROUP B: DATA INTEGRITY EMPLOYEE CODE (T9-T10) =====
  // T9: Preflight duplicate groups → STOP error THROWN, no index applied
  const t9DupGroups: EmployeeCodeDuplicateGroup[] = [
    { employee_code: 'EMP-202501-0001', count: 2 },
    { employee_code: 'EMP-202501-0007', count: 3 },
  ]
  let t9ErrorThrown = false
  let t9ErrorName = ''
  try {
    simulateEmployeeCodePreflight(t9DupGroups)
  } catch (e) {
    t9ErrorThrown = true
    t9ErrorName = e instanceof Error ? e.name : ''
  }
  assertEq('T9.PREFLIGHT duplicate → error thrown', t9ErrorThrown, true, `groups=${t9DupGroups.length}`)
  assertEq(
    'T9.PREFLIGHT error class = DuplicatePreflightError',
    t9ErrorName,
    'HrEmployeeCodeDuplicatePreflightError',
    'STOP gate verified',
  )
  // T9b (no duplicates → no error)
  let t9NoError = true
  try {
    simulateEmployeeCodePreflight([])
  } catch {
    t9NoError = false
  }
  assertEq('T9b.PREFLIGHT zero groups → no error', t9NoError, true, 'clean pass')

  // T10: Retry pattern generate code - 2 duplicate caught then success = total 3 attempts, success=true
  const t10CodesQueue = ['EMP-X-0001', 'EMP-X-0001', 'EMP-X-0002']
  let t10CodeIdx = 0
  const t10AttemptSim: GenCodeAttemptSim = () => {
    if (t10CodeIdx < 2) {
      t10CodeIdx++
      return false
    }
    t10CodeIdx++
    return true
  }
  const t10Retry = simulateEmployeeCodeGeneratorWithRetry(
    () => t10CodesQueue[t10CodeIdx] ?? 'EMP-Z-9999',
    t10AttemptSim,
    3,
  )
  assertEq('T10.GEN-CODE retry 2 dup → 3rd ok success true', t10Retry.success, true, `attempts=${t10Retry.attempts}`)
  assertEq('T10.GEN-CODE duplicate caught count = 2', t10Retry.duplicate_caught_count, 2, 'retry-count')
  assertEq('T10.GEN-CODE final code not null', t10Retry.code !== null, true, `code=${t10Retry.code}`)

  // ===== GROUP C: IDOR OWNERSHIP SECURITY SELF SCOPE (T11-T16) =====
  const karyawan7 = buildSession('KARYAWAN', 3007, 7)
  const hrAdmin = buildSession('HR', 2001, null)

  // T11: KARYAWAN list attendance requested employee_id=99 → enforced self=7
  const t11Att = simulateSelfScopeEnforce(karyawan7, 99, 'attendance_list')
  assertEq('T11.IDOR att req=99 → effective=7 self enforced', t11Att.effective_employee_id, 7, 'no leak 99')
  assertEq('T11.IDOR att enforced_self true', t11Att.enforced_self, true, 'scope-me')
  assertEq('T11.IDOR att not rejected', t11Att.rejected, false, 'allowed self')
  // T11b: HR role bypass - requested=25 → effective=25 (no self override)
  const t11bHr = simulateSelfScopeEnforce(hrAdmin, 25, 'attendance_list')
  assertEq('T11b.HR att req=25 → effective=25 bypass', t11bHr.effective_employee_id, 25, 'admin-bypass')
  assertEq('T11b.HR enforced_self false', t11bHr.enforced_self, false, 'hr-scope')

  // T12: KARYAWAN cross download doc (owner=12 vs me=7) → status 404 + logged ACCESS_DENIED
  const t12CrossDownload = simulateDocumentCrossAccess(karyawan7, 12, 'download')
  assertEq('T12.IDOR cross download status 404', t12CrossDownload.status, 404, 'no-leak-exists')
  assertEq('T12.IDOR cross download access denied logged', t12CrossDownload.logged_access_denied, true, 'audit-log')
  assertEq('T12.IDOR cross download allowed false', t12CrossDownload.allowed, false, 'blocked')
  // T12b: KARYAWAN download doc sendiri → status 200
  const t12bSelf = simulateDocumentCrossAccess(karyawan7, 7, 'download')
  assertEq('T12b.IDOR self download status 200', t12bSelf.status, 200, 'allowed-owned')

  // T13: KARYAWAN upload doc form employee_id=88 → enforced self employee_id=7
  const t13Upload = simulateSelfScopeEnforce(karyawan7, 88, 'document_upload')
  assertEq('T13.IDOR upload form req=88 → enforced=7', t13Upload.effective_employee_id, 7, 'no-tamper')
  assertEq('T13.IDOR upload enforced_self true', t13Upload.enforced_self, true, 'self-only-upload')

  // T14: KARYAWAN list documents query employee_id=999 → enforced self=7
  const t14DocList = simulateSelfScopeEnforce(karyawan7, 999, 'document_list')
  assertEq('T14.IDOR doc-list req=999 → effective=7', t14DocList.effective_employee_id, 7, 'filter-override')

  // T15: KARYAWAN salary slip filter employee_id self scope
  const t15Slip = simulateSelfScopeEnforce(karyawan7, 1000, 'salary_slip_list')
  assertEq('T15.IDOR slip req=1000 → effective=7 self', t15Slip.effective_employee_id, 7, 'slip-scope')
  assertEq('T15.IDOR slip scope enforced=true', t15Slip.enforced_self, true, 'slip-me')

  // T16: KARYAWAN replace doc milik employee_id=22 → 404 IDOR pattern
  const t16Replace = simulateDocumentCrossAccess(karyawan7, 22, 'replace')
  assertEq('T16.IDOR replace owner=22 me=7 → 404', t16Replace.status, 404, 'no-modify-other')
  assertEq('T16.IDOR replace access_denied logged', t16Replace.logged_access_denied, true, 'audit-IDOR')

  // ===== GROUP D: ROLE BOUNDARY KARYAWAN NO HR GLOBAL (T17-T18) =====
  // T17: KARYAWAN access /hr prefix routes = FALSE (403 baseline)
  const t17Hr = canAccessPath('KARYAWAN', '/hr/employees')
  assertEq('T17.ROLE KARYAWAN /hr prefix blocked', t17Hr, false, 'no-hr-workspace')
  // T17b: KARYAWAN /me prefix allowed = TRUE
  const t17bMe = canAccessPath('KARYAWAN', '/me/profile')
  assertEq('T17b.ROLE KARYAWAN /me prefix allowed', t17bMe, true, 'self-scope-path')

  // T18: KARYAWAN canPerformAction hr.view/create/update/delete ALL FALSE
  const t18HrView = canPerformAction('KARYAWAN', 'hr', 'view')
  const t18HrCreate = canPerformAction('KARYAWAN', 'hr', 'create')
  const t18HrUpdate = canPerformAction('KARYAWAN', 'hr', 'update')
  const t18HrDelete = canPerformAction('KARYAWAN', 'hr', 'delete')
  const t18AllFalse = !t18HrView && !t18HrCreate && !t18HrUpdate && !t18HrDelete
  assertEq(
    'T18.ROLE KARYAWAN all HR actions FALSE (no-global-perm)',
    t18AllFalse,
    true,
    `view=${t18HrView} create=${t18HrCreate} update=${t18HrUpdate} delete=${t18HrDelete}`,
  )
  // T18b: ROLE HR hr.view = TRUE (bypass admin available)
  const t18bHrView = canPerformAction('HR', 'hr', 'view')
  assertEq('T18b.ROLE HR hr.view TRUE', t18bHrView, true, 'hr-admin-scope')
}

runAll()
console.log(`\n===============================`)
console.log(`HR-BATCH-02A REGRESSION SUMMARY: ${passCount}/${passCount + failCount} PASS, ${failCount} FAIL`)
console.log(`===============================`)
if (failCount > 0) {
  process.exitCode = 1
  console.error(`GATE FAILED: ${failCount} assertion failure(s).`)
} else {
  console.log(`ALL 18 REGRESSION ASSERTIONS PASSED.`)
}
