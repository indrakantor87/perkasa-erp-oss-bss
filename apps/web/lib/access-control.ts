import type { AccessAction, AppRole, PermissionMatrixEntry } from '@/lib/types'

type DbPermissionSets = Partial<Record<AppRole, Set<string>>>

function getDbPermissionSets() {
  if (typeof window !== 'undefined') {
    return null
  }
  const container = globalThis as unknown as { __perkasaAccessPermissionSets?: DbPermissionSets }
  return container.__perkasaAccessPermissionSets ?? null
}

const baselineRoleAllowedPrefixes: Record<AppRole, string[]> = {
  SUPER_ADMIN: [
    '/dashboard',
    '/import',
    '/sales',
    '/customers',
    '/support',
    '/inventory',
    '/hr',
    '/billing',
    '/settings/access',
    '/settings/users',
  ],
  SALES_MARKETING: ['/dashboard', '/sales', '/customers', '/support', '/inventory'],
  CS_OPERATOR: ['/dashboard', '/sales', '/customers', '/support', '/inventory'],
  CS_ADMIN: ['/dashboard', '/sales', '/customers', '/support', '/inventory'],
  NOC_OPERATOR: ['/dashboard', '/support', '/inventory'],
  FIELD_TECHNICIAN: ['/dashboard', '/support', '/inventory'],
  TT_OPERATOR: ['/dashboard', '/support'],
  DIGITAL_CREATOR: ['/dashboard', '/sales'],
  DISMANTLE_OPERATOR: ['/dashboard', '/support'],
}

const baselineRoleLandingPaths: Record<AppRole, string> = {
  SUPER_ADMIN: '/dashboard',
  SALES_MARKETING: '/sales',
  CS_OPERATOR: '/dashboard/worklist',
  CS_ADMIN: '/customers/cs-admin',
  NOC_OPERATOR: '/support/tt',
  FIELD_TECHNICIAN: '/dashboard/worklist',
  TT_OPERATOR: '/support/tt',
  DIGITAL_CREATOR: '/sales/digital-creator',
  DISMANTLE_OPERATOR: '/support/dismantle',
}

const baselineRolePermissionMatrix: Record<AppRole, PermissionMatrixEntry[]> = {
  SUPER_ADMIN: [
    { resource: 'dashboard', label: 'Dashboard Global', actions: ['view', 'export', 'manage'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'import_center', label: 'Import Center', actions: ['view', 'create', 'approve', 'export'] },
    { resource: 'sales', label: 'Penjualan', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'customers', label: 'Customer & Subscription', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'hr', label: 'HR', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'billing', label: 'Billing', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'access_settings', label: 'Akses & Permission', actions: ['view', 'manage'] },
    { resource: 'user_settings', label: 'Manajemen User Internal', actions: ['view', 'manage'] },
  ],
  SALES_MARKETING: [
    { resource: 'dashboard', label: 'Dashboard Marketing', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'sales', label: 'Penjualan', actions: ['view', 'create', 'update', 'export'] },
    { resource: 'customers', label: 'Customer & Subscription', actions: ['view', 'create', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view'] },
  ],
  CS_OPERATOR: [
    { resource: 'dashboard', label: 'Dashboard CS', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'sales', label: 'Penjualan', actions: ['view', 'create', 'update'] },
    { resource: 'customers', label: 'Customer & Subscription', actions: ['view', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view', 'update'] },
  ],
  CS_ADMIN: [
    { resource: 'dashboard', label: 'Dashboard Admin CS', actions: ['view', 'export'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'sales', label: 'Penjualan', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'customers', label: 'Customer & Subscription', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view', 'update', 'approve', 'export'] },
  ],
  NOC_OPERATOR: [
    { resource: 'dashboard', label: 'Dashboard NOC', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update', 'export'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view', 'update', 'export'] },
  ],
  FIELD_TECHNICIAN: [
    { resource: 'dashboard', label: 'Dashboard Teknisi', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view', 'update'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view', 'update'] },
  ],
  TT_OPERATOR: [
    { resource: 'dashboard', label: 'Dashboard Trouble Ticket', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update'] },
  ],
  DIGITAL_CREATOR: [
    { resource: 'dashboard', label: 'Dashboard Creator Digital', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'sales', label: 'Penjualan', actions: ['view', 'create', 'update', 'export'] },
  ],
  DISMANTLE_OPERATOR: [
    { resource: 'dashboard', label: 'Dashboard Dismantle', actions: ['view'] },
    { resource: 'daily_activity', label: 'Daily Activity', actions: ['view', 'create', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view', 'update'] },
  ],
}

export function buildRoutePrefixPermissionCode(prefix: string) {
  return `route_prefix:${prefix}`
}

export function buildResourceActionPermissionCode(
  resource: PermissionMatrixEntry['resource'],
  action: AccessAction
) {
  return `res:${resource}:${action}`
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function canAccessPath(role: AppRole, pathname: string) {
  return getAllowedPrefixes(role).some((prefix) => matchesPrefix(pathname, prefix))
}

export function getAllowedPrefixes(role: AppRole) {
  const sets = getDbPermissionSets()
  const codes = sets?.[role]
  if (codes && codes.size > 0) {
    const prefixes = Array.from(codes)
      .filter((code) => code.startsWith('route_prefix:'))
      .map((code) => code.replace(/^route_prefix:/, ''))
      .filter(Boolean)

    if (prefixes.length > 0) {
      return prefixes
    }
  }

  return baselineRoleAllowedPrefixes[role]
}

export function getDefaultLandingPath(role: AppRole) {
  const allowedPrefixes = getAllowedPrefixes(role)
  const preferredPath = baselineRoleLandingPaths[role]

  if (preferredPath && allowedPrefixes.some((prefix) => matchesPrefix(preferredPath, prefix))) {
    return preferredPath
  }

  return allowedPrefixes[0] ?? '/dashboard'
}

export function getPermissionMatrix(role: AppRole) {
  const sets = getDbPermissionSets()
  const codes = sets?.[role]
  if (!codes || codes.size === 0) {
    return baselineRolePermissionMatrix[role]
  }

  const hasResourcePermission = Array.from(codes).some((code) => code.startsWith('res:'))
  if (!hasResourcePermission) {
    return baselineRolePermissionMatrix[role]
  }

  return baselineRolePermissionMatrix[role].map((entry) => ({
    ...entry,
    actions: entry.actions.filter((action) => codes.has(buildResourceActionPermissionCode(entry.resource, action))),
  }))
}

export function canPerformAction(role: AppRole, resource: PermissionMatrixEntry['resource'], action: AccessAction) {
  const sets = getDbPermissionSets()
  const codes = sets?.[role]
  if (codes && codes.size > 0) {
    const code = buildResourceActionPermissionCode(resource, action)
    const hasResourcePermission = Array.from(codes).some((item) => item.startsWith('res:'))
    if (hasResourcePermission) {
      return codes.has(code)
    }
  }

  return baselineRolePermissionMatrix[role].some((entry) => entry.resource === resource && entry.actions.includes(action))
}

export function getPermissionSummary(role: AppRole) {
  const entries = getPermissionMatrix(role)

  return {
    resourceCount: entries.length,
    approvalCount: entries.filter((entry) => entry.actions.includes('approve')).length,
    manageCount: entries.filter((entry) => entry.actions.includes('manage')).length,
  }
}

export function getBaselineAllowedPrefixes(role: AppRole) {
  return baselineRoleAllowedPrefixes[role]
}

export function getBaselineDefaultLandingPath(role: AppRole) {
  return baselineRoleLandingPaths[role]
}

export function getBaselinePermissionMatrix(role: AppRole) {
  return baselineRolePermissionMatrix[role]
}
