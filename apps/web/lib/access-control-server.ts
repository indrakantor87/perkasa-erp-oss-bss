import 'server-only'

import type { AccessAction, AppRole, PermissionMatrixEntry } from '@/lib/types'
import {
  buildResourceActionPermissionCode,
  buildRoutePrefixPermissionCode,
  getBaselineAllowedPrefixes,
  getBaselinePermissionMatrix,
} from '@/lib/access-control'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbQuery } from '@/lib/review-db'

type RolePermissionRow = {
  roleCode: string
  permissionCode: string
}

let dbPermissionLoaded = false
let dbPermissionSets: Partial<Record<AppRole, Set<string>>> = {}
let dbPermissionLoadPromise: Promise<void> | null = null

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function invalidateAccessControlCache() {
  dbPermissionLoaded = false
  dbPermissionSets = {}
  dbPermissionLoadPromise = null
  ;(globalThis as unknown as { __perkasaAccessPermissionSets?: Partial<Record<AppRole, Set<string>>> }).__perkasaAccessPermissionSets =
    {}
}

async function loadAccessControlFromDb() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return
  }

  const rows = await runReviewDbQuery<RolePermissionRow>(`
    SELECT
      r.code AS roleCode,
      p.code AS permissionCode
    FROM auth_role_permissions rp
    JOIN auth_roles r
      ON r.id = rp.role_id
    JOIN auth_permissions p
      ON p.id = rp.permission_id
    ORDER BY r.code, p.code
  `)

  const nextSets: Partial<Record<AppRole, Set<string>>> = {}
  for (const row of rows) {
    const roleCode = String(row.roleCode || '').trim().toUpperCase()
    if (roleCode !== 'SUPER_ADMIN' && roleCode !== 'ADMIN_DIVISI' && roleCode !== 'OPERATOR') {
      continue
    }
    const permissionCode = String(row.permissionCode || '').trim()
    if (!permissionCode) {
      continue
    }

    const role = roleCode as AppRole
    const set = nextSets[role] ?? new Set<string>()
    set.add(permissionCode)
    nextSets[role] = set
  }

  dbPermissionSets = nextSets
  ;(globalThis as unknown as { __perkasaAccessPermissionSets?: Partial<Record<AppRole, Set<string>>> }).__perkasaAccessPermissionSets =
    nextSets
}

export async function primeAccessControlCache() {
  if (dbPermissionLoaded) {
    return
  }

  if (!dbPermissionLoadPromise) {
    dbPermissionLoadPromise = loadAccessControlFromDb()
      .catch(() => null)
      .then(() => {
        dbPermissionLoaded = true
      })
  }

  await dbPermissionLoadPromise
}

export function getAllowedPrefixes(role: AppRole) {
  const codes = dbPermissionSets[role]
  if (codes && codes.size > 0) {
    const prefixes = Array.from(codes)
      .filter((code) => code.startsWith('route_prefix:'))
      .map((code) => code.replace(/^route_prefix:/, ''))
      .filter(Boolean)

    if (prefixes.length > 0) {
      return prefixes
    }
  }

  return getBaselineAllowedPrefixes(role)
}

export function canAccessPath(role: AppRole, pathname: string) {
  return getAllowedPrefixes(role).some((prefix) => matchesPrefix(pathname, prefix))
}

export function getDefaultLandingPath(role: AppRole) {
  return getAllowedPrefixes(role)[0] ?? '/dashboard'
}

export function getPermissionMatrix(role: AppRole) {
  const codes = dbPermissionSets[role]
  if (!codes || codes.size === 0) {
    return getBaselinePermissionMatrix(role)
  }

  const hasResourcePermission = Array.from(codes).some((code) => code.startsWith('res:'))
  if (!hasResourcePermission) {
    return getBaselinePermissionMatrix(role)
  }

  return getBaselinePermissionMatrix(role).map((entry) => ({
    ...entry,
    actions: entry.actions.filter((action) =>
      codes.has(buildResourceActionPermissionCode(entry.resource, action))
    ),
  }))
}

export function canPerformAction(role: AppRole, resource: PermissionMatrixEntry['resource'], action: AccessAction) {
  const codes = dbPermissionSets[role]
  if (codes && codes.size > 0) {
    const code = buildResourceActionPermissionCode(resource, action)
    const hasResourcePermission = Array.from(codes).some((item) => item.startsWith('res:'))
    if (hasResourcePermission) {
      return codes.has(code)
    }
  }

  return getBaselinePermissionMatrix(role).some(
    (entry) => entry.resource === resource && entry.actions.includes(action)
  )
}

export function getPermissionSummary(role: AppRole) {
  const entries = getPermissionMatrix(role)

  return {
    resourceCount: entries.length,
    approvalCount: entries.filter((entry) => entry.actions.includes('approve')).length,
    manageCount: entries.filter((entry) => entry.actions.includes('manage')).length,
  }
}

export function buildRoutePrefixPermissionsFromAllowedPrefixes(prefixes: string[]) {
  return prefixes.map((prefix) => buildRoutePrefixPermissionCode(prefix))
}
