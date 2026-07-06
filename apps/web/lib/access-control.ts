import type { AccessAction, AppRole, PermissionMatrixEntry } from '@/lib/types'

const roleAllowedPrefixes: Record<AppRole, string[]> = {
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
  ADMIN_DIVISI: ['/dashboard', '/import', '/sales', '/customers', '/support', '/inventory', '/billing'],
  OPERATOR: ['/dashboard', '/customers', '/support'],
}

const rolePermissionMatrix: Record<AppRole, PermissionMatrixEntry[]> = {
  SUPER_ADMIN: [
    { resource: 'dashboard', label: 'Dashboard Global', actions: ['view', 'export', 'manage'] },
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
  ADMIN_DIVISI: [
    { resource: 'dashboard', label: 'Dashboard Divisi', actions: ['view', 'export'] },
    { resource: 'import_center', label: 'Import Center', actions: ['view', 'create', 'approve'] },
    { resource: 'sales', label: 'Penjualan', actions: ['view', 'create', 'update', 'approve'] },
    { resource: 'customers', label: 'Customer & Subscription', actions: ['view', 'create', 'update', 'export'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update', 'approve', 'export'] },
    { resource: 'inventory', label: 'Inventory', actions: ['view', 'create', 'update', 'export'] },
    { resource: 'billing', label: 'Billing', actions: ['view', 'create', 'update', 'export'] },
  ],
  OPERATOR: [
    { resource: 'dashboard', label: 'Dashboard Operasional', actions: ['view'] },
    { resource: 'customers', label: 'Customer & Subscription', actions: ['view', 'update'] },
    { resource: 'support', label: 'Support', actions: ['view', 'create', 'update'] },
  ],
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function canAccessPath(role: AppRole, pathname: string) {
  return roleAllowedPrefixes[role].some((prefix) => matchesPrefix(pathname, prefix))
}

export function getAllowedPrefixes(role: AppRole) {
  return roleAllowedPrefixes[role]
}

export function getDefaultLandingPath(role: AppRole) {
  return roleAllowedPrefixes[role][0] ?? '/dashboard'
}

export function getPermissionMatrix(role: AppRole) {
  return rolePermissionMatrix[role]
}

export function canPerformAction(role: AppRole, resource: PermissionMatrixEntry['resource'], action: AccessAction) {
  return rolePermissionMatrix[role].some(
    (entry) => entry.resource === resource && entry.actions.includes(action)
  )
}

export function getPermissionSummary(role: AppRole) {
  const entries = rolePermissionMatrix[role]

  return {
    resourceCount: entries.length,
    approvalCount: entries.filter((entry) => entry.actions.includes('approve')).length,
    manageCount: entries.filter((entry) => entry.actions.includes('manage')).length,
  }
}
