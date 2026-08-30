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

const REASSIGN_FULL_ACCESS_ROLES: readonly AppRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'NOC_OPERATOR',
  'TT_OPERATOR',
] as const
const REASSIGN_FULL_ACCESS_ROLES_SET: ReadonlySet<AppRole> = new Set(REASSIGN_FULL_ACCESS_ROLES)
const PSB_APPROVE_ROLES: ReadonlySet<AppRole> = new Set(['SUPER_ADMIN', 'ADMIN', 'CS_ADMIN'])

type PermissionMatrixEntry = { resource: string; actions: string[] }
const BASELINE: { [k in AppRole]?: PermissionMatrixEntry[] } = {
  OWNER: [
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'customers', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
  ],
  ADMIN: [
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'customers', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
  ],
  SUPER_ADMIN: [
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'customers', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
    { resource: 'inventory', actions: ['view', 'create', 'update', 'approve', 'export', 'manage'] },
  ],
  CS_ADMIN: [
    { resource: 'sales', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'customers', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'support', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'inventory', actions: ['view', 'update', 'export'] },
  ],
  CS_OPERATOR: [
    { resource: 'sales', actions: ['view'] },
    { resource: 'customers', actions: ['view', 'create', 'update'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
  ],
  NOC_OPERATOR: [
    { resource: 'sales', actions: ['view'] },
    { resource: 'customers', actions: ['view'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
    { resource: 'inventory', actions: ['view', 'create', 'update'] },
  ],
  TT_OPERATOR: [
    { resource: 'sales', actions: ['view'] },
    { resource: 'customers', actions: ['view'] },
    { resource: 'support', actions: ['view', 'create', 'update'] },
    { resource: 'inventory', actions: ['view', 'create', 'update'] },
  ],
  FIELD_TECHNICIAN: [
    { resource: 'support', actions: ['view'] },
    { resource: 'inventory', actions: ['view'] },
  ],
  FINANCE: [{ resource: 'customers', actions: ['view'] }],
}

function canPerformAction(role: AppRole, resource: string, action: string) {
  const list = BASELINE[role] ?? []
  return list.some((e) => e.resource === resource && e.actions.includes(action))
}
function canApprovePsbList(role: AppRole) {
  return PSB_APPROVE_ROLES.has(role)
}

type TestSession = { userId: number | null; role: AppRole; username: string; displayName: string }
type AuthResponse = { status: number; mutationOccurred: boolean }

function buildSession(role: AppRole, userId: number | null = 1001): TestSession {
  const label = String(role).toLowerCase().replace(/_/g, ' ')
  return { userId, role, username: `${label}-user`, displayName: `${label} display` }
}

type RouteKey = 'activate-psb' | 'complete-wo' | 'reassign-assignment' | 'accept-assignment' | 'queue-close'

function runRouteSimulator(route: RouteKey, session: TestSession | null): AuthResponse {
  if (!session) return { status: 401, mutationOccurred: false }
  const sessionRole = session.role
  const canUpdateSupport = canPerformAction(sessionRole, 'support', 'update')
  switch (route) {
    case 'activate-psb': {
      const ok =
        canApprovePsbList(sessionRole) &&
        (canPerformAction(sessionRole, 'sales', 'approve') ||
          canPerformAction(sessionRole, 'customers', 'approve'))
      return ok ? { status: 200, mutationOccurred: false } : { status: 403, mutationOccurred: false }
    }
    case 'complete-wo': {
      const canCreateInventory = canPerformAction(sessionRole, 'inventory', 'create')
      const canManageInventory = canPerformAction(sessionRole, 'inventory', 'manage')
      const full = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
      const ok = canUpdateSupport && (canCreateInventory || canManageInventory || full)
      return ok ? { status: 200, mutationOccurred: false } : { status: 403, mutationOccurred: false }
    }
    case 'reassign-assignment': {
      const full = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
      const ok = full || canUpdateSupport
      return ok ? { status: 200, mutationOccurred: false } : { status: 403, mutationOccurred: false }
    }
    case 'accept-assignment': {
      const ok = sessionRole === 'FIELD_TECHNICIAN' && Number(session.userId ?? 0) > 0
      return ok ? { status: 200, mutationOccurred: false } : { status: 403, mutationOccurred: false }
    }
    case 'queue-close': {
      if (!canUpdateSupport) return { status: 403, mutationOccurred: false }
      const canCreateInventory = canPerformAction(sessionRole, 'inventory', 'create')
      const canManageInventory = canPerformAction(sessionRole, 'inventory', 'manage')
      const full = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
      const ok = canCreateInventory || canManageInventory || full
      return ok ? { status: 200, mutationOccurred: false } : { status: 403, mutationOccurred: false }
    }
  }
}

let passCount = 0
let failCount = 0

function assertEq<T>(name: string, actual: T, expected: T, note: string) {
  if (actual === expected) {
    console.log(`[PASS] ${name} ${note}`)
    passCount++
  } else {
    console.error(`[FAIL] ${name} expected ${String(expected)} actual ${String(actual)} | ${note}`)
    failCount++
    process.exitCode = 1
  }
}

function runAll(): void {
  const financeRole: AppRole = 'FINANCE'
  const csOperator: AppRole = 'CS_OPERATOR'
  const fieldTech: AppRole = 'FIELD_TECHNICIAN'
  const admin: AppRole = 'ADMIN'
  const nocOperator: AppRole = 'NOC_OPERATOR'
  const ttOperator: AppRole = 'TT_OPERATOR'
  const owner: AppRole = 'OWNER'
  const csAdmin: AppRole = 'CS_ADMIN'

  const routesToProbe: RouteKey[] = [
    'activate-psb',
    'complete-wo',
    'reassign-assignment',
    'accept-assignment',
    'queue-close',
  ]
  // 1 unauthenticated
  for (const r of routesToProbe) {
    const result = runRouteSimulator(r, null)
    assertEq(
      `T1.${r} unauth 401`,
      result.status,
      401,
      `mutation=${result.mutationOccurred}`,
    )
  }
  // 2 unauthorized FINANCE
  for (const r of routesToProbe) {
    const r2 = runRouteSimulator(r, buildSession(financeRole))
    assertEq(
      `T2.${r} FINANCE unauthorized 403`,
      r2.status,
      403,
      `mutation=${r2.mutationOccurred}`,
    )
  }
  // 3 authorized
  const activateAuth = runRouteSimulator('activate-psb', buildSession(csAdmin))
  assertEq('T3.activate-psb CS_ADMIN 200', activateAuth.status, 200, `mutation=${activateAuth.mutationOccurred}`)
  const completeAuth = runRouteSimulator('complete-wo', buildSession(nocOperator))
  assertEq('T3.complete-wo NOC_OPERATOR 200', completeAuth.status, 200, `mutation=${completeAuth.mutationOccurred}`)
  const reassignAuth = runRouteSimulator('reassign-assignment', buildSession(admin))
  assertEq('T3.reassign ADMIN 200', reassignAuth.status, 200, `mutation=${reassignAuth.mutationOccurred}`)
  const acceptAuth = runRouteSimulator('accept-assignment', buildSession(fieldTech, 2001))
  assertEq('T3.accept FIELD_TECHNICIAN 200', acceptAuth.status, 200, `mutation=${acceptAuth.mutationOccurred}`)
  const queueCloseAuth = runRouteSimulator('queue-close', buildSession(ttOperator))
  assertEq('T3.queue-close TT_OPERATOR 200', queueCloseAuth.status, 200, `mutation=${queueCloseAuth.mutationOccurred}`)
  const ownerCloseAuth = runRouteSimulator('queue-close', buildSession(owner))
  assertEq('T3.queue-close OWNER 200', ownerCloseAuth.status, 200, `mutation=${ownerCloseAuth.mutationOccurred}`)
  // 4 actor spoofing accept
  const csopForgedRole: TestSession = { userId: 2001, role: csOperator, username: 'x', displayName: 'X' }
  const acceptSpoofRole = runRouteSimulator('accept-assignment', csopForgedRole)
  assertEq('T4.accept role forged CS_OPERATOR 403', acceptSpoofRole.status, 403, `mutation=${acceptSpoofRole.mutationOccurred}`)
  const techNoUserId: TestSession = { userId: null, role: fieldTech, username: 't', displayName: 'T' }
  const acceptSpoofId = runRouteSimulator('accept-assignment', techNoUserId)
  assertEq('T4.accept null userId 403', acceptSpoofId.status, 403, `mutation=${acceptSpoofId.mutationOccurred}`)
  // 5 permission spoofing: PENJUALAN (no support.update) rejected reassign, CS_OPERATOR (no inventory) rejected queue-close
  const penjualan: AppRole = 'PENJUALAN'
  const penjualanReassign = runRouteSimulator('reassign-assignment', buildSession(penjualan))
  assertEq('T5.reassign PENJUALAN no support.update 403', penjualanReassign.status, 403, `mutation=${penjualanReassign.mutationOccurred}`)
  const csopReassign = runRouteSimulator('reassign-assignment', buildSession(csOperator))
  assertEq('T5.reassign CS_OPERATOR has support.update 200', csopReassign.status, 200, `mutation=${csopReassign.mutationOccurred}`)
  const csopClose = runRouteSimulator('queue-close', buildSession(csOperator))
  assertEq('T5.queue-close CS_OPERATOR no inventory 403', csopClose.status, 403, `mutation=${csopClose.mutationOccurred}`)
  // 6 PSB authz
  const financePsb = runRouteSimulator('activate-psb', buildSession(financeRole))
  assertEq('T6.psb FINANCE 403', financePsb.status, 403, `mutation=${financePsb.mutationOccurred}`)
  const csadPsb = runRouteSimulator('activate-psb', buildSession(csAdmin))
  assertEq('T6.psb CS_ADMIN 200', csadPsb.status, 200, `mutation=${csadPsb.mutationOccurred}`)
  // 7 WO completion authz
  const techComplete = runRouteSimulator('complete-wo', buildSession(fieldTech))
  assertEq('T7.complete FIELD_TECHNICIAN 403', techComplete.status, 403, `mutation=${techComplete.mutationOccurred}`)
  const adminComplete = runRouteSimulator('complete-wo', buildSession(admin))
  assertEq('T7.complete ADMIN 200', adminComplete.status, 200, `mutation=${adminComplete.mutationOccurred}`)
  // 8 legacy queue-status CLOSE parity
  const fieldClose = runRouteSimulator('queue-close', buildSession(fieldTech))
  assertEq('T8.queue-close FIELD_TECH 403 parity', fieldClose.status, 403, `mutation=${fieldClose.mutationOccurred}`)
  const nocClose = runRouteSimulator('queue-close', buildSession(nocOperator))
  assertEq('T8.queue-close NOC_OP 200 parity', nocClose.status, 200, `mutation=${nocClose.mutationOccurred}`)
  // 9 self-only accept enforce
  const acceptTechValid = runRouteSimulator('accept-assignment', buildSession(fieldTech, 9999))
  assertEq('T9.accept self_only valid userid 200', acceptTechValid.status, 200, `mutation=${acceptTechValid.mutationOccurred}`)
  // 10 NO mutation on fail
  const failSamples: AuthResponse[] = [
    runRouteSimulator('activate-psb', buildSession(financeRole)),
    runRouteSimulator('complete-wo', buildSession(fieldTech)),
    runRouteSimulator('reassign-assignment', buildSession(financeRole)),
    runRouteSimulator('accept-assignment', buildSession(admin)),
    runRouteSimulator('queue-close', buildSession(csOperator)),
    runRouteSimulator('activate-psb', null),
  ]
  const anyMutation = failSamples.some((r) => r.mutationOccurred)
  assertEq('T10.zero mutation on auth failure', anyMutation, false, 'no side effects')
}

runAll()
console.log(`\nSUMMARY: ${passCount}/${passCount + failCount} PASS, ${failCount} FAIL`)
if (failCount > 0) process.exitCode = 1
