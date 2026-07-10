import type { AppRole, PermissionMatrixEntry } from '@/lib/types'
import {
  buildResourceActionPermissionCode,
  buildRoutePrefixPermissionCode,
  getBaselineAllowedPrefixes,
  getBaselinePermissionMatrix,
} from '@/lib/access-control'
import { invalidateAccessControlCache } from '@/lib/access-control-server'
import { runReviewDbExecute, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import { recordAuthPermissionAudit } from '@/lib/services/auth-permission-audit-service'
import { recordAuthRolePermissionAudit } from '@/lib/services/auth-role-permission-audit-service'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

export type DbRole = {
  id: number
  code: string
  name: string
}

export type DbPermission = {
  id: number
  code: string
  name: string
}

type IdRow = {
  id: number
}

type RolePermissionRow = {
  code: string
}

function normalizePermissionCode(value: unknown) {
  return String(value ?? '').trim()
}

export async function listDbRoles(): Promise<DbRole[]> {
  const rows = await runReviewDbQuery<DbRole>(`
    SELECT id, code, name
    FROM auth_roles
    ORDER BY id ASC
  `)

  return rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
  }))
}

export async function listDbPermissions(): Promise<DbPermission[]> {
  const rows = await runReviewDbQuery<DbPermission>(`
    SELECT id, code, name
    FROM auth_permissions
    ORDER BY code ASC
  `)

  return rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
  }))
}

export async function getRolePermissionCodes(roleId: number): Promise<string[]> {
  const rows = await runReviewDbQuery<RolePermissionRow>(
    `
      SELECT p.code AS code
      FROM auth_role_permissions rp
      JOIN auth_permissions p
        ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.code ASC
    `,
    [roleId]
  )

  return rows.map((row) => String(row.code))
}

export async function setRolePermissionCodes(params: {
  roleId: number
  roleCode: string
  permissionCodes: string[]
  actor: string
}) {
  const normalized = Array.from(
    new Set(params.permissionCodes.map((code) => normalizePermissionCode(code)).filter(Boolean))
  )
  const before = await getRolePermissionCodes(params.roleId).catch(() => [])

  await runReviewDbExecute('START TRANSACTION')
  try {
    await runReviewDbExecute<ExecuteResult>(
      `
        DELETE FROM auth_role_permissions
        WHERE role_id = ?
      `,
      [params.roleId]
    )

    if (normalized.length > 0) {
      const permissionIds = await runReviewDbQuery<IdRow>(
        `
          SELECT id
          FROM auth_permissions
          WHERE code IN (${normalized.map(() => '?').join(',')})
        `,
        normalized
      )

      if (permissionIds.length > 0) {
        const values = permissionIds.map(() => '(?, ?)').join(',')
        const args = permissionIds.flatMap((row) => [params.roleId, row.id])
        await runReviewDbExecute<ExecuteResult>(
          `
            INSERT INTO auth_role_permissions (role_id, permission_id)
            VALUES ${values}
          `,
          args
        )
      }
    }

    await runReviewDbExecute('COMMIT')
  } catch (error) {
    await runReviewDbExecute('ROLLBACK').catch(() => null)
    throw error
  }

  const after = await getRolePermissionCodes(params.roleId).catch(() => normalized)
  invalidateAccessControlCache()
  await recordAuthRolePermissionAudit({
    actionType: 'SET',
    actor: params.actor,
    roleCode: params.roleCode,
    detail: JSON.stringify({ before, after }),
  }).catch(() => null)

  return { before, after }
}

function buildBaselinePermissionSeeds() {
  const roles: { code: AppRole; name: string }[] = [
    { code: 'SUPER_ADMIN', name: 'Super Admin' },
    { code: 'SALES_MARKETING', name: 'Sales Marketing' },
    { code: 'CS_OPERATOR', name: 'CS Operator' },
    { code: 'CS_ADMIN', name: 'CS Admin' },
    { code: 'NOC_OPERATOR', name: 'NOC Operator' },
    { code: 'FIELD_TECHNICIAN', name: 'Field Technician' },
    { code: 'TT_OPERATOR', name: 'Trouble Ticket Operator' },
    { code: 'DIGITAL_CREATOR', name: 'Digital Creator' },
    { code: 'DISMANTLE_OPERATOR', name: 'Dismantle Operator' },
  ]

  const permissionSet = new Map<string, string>()

  for (const role of roles) {
    for (const prefix of getBaselineAllowedPrefixes(role.code)) {
      const code = buildRoutePrefixPermissionCode(prefix)
      if (!permissionSet.has(code)) {
        permissionSet.set(code, `Akses route prefix ${prefix}`)
      }
    }

    for (const entry of getBaselinePermissionMatrix(role.code)) {
      for (const action of entry.actions) {
        const code = buildResourceActionPermissionCode(entry.resource, action)
        if (!permissionSet.has(code)) {
          permissionSet.set(code, `${entry.label} (${entry.resource}) : ${action}`)
        }
      }
    }
  }

  return { roles, permissions: Array.from(permissionSet.entries()).map(([code, name]) => ({ code, name })) }
}

export async function bootstrapAccessPermissions(actor: string) {
  const seeds = buildBaselinePermissionSeeds()

  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS auth_roles (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(120) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_roles_code (code)
      )
    `
  )
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS auth_permissions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_permissions_code (code)
      )
    `
  )
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS auth_role_permissions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        role_id BIGINT UNSIGNED NOT NULL,
        permission_id BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_role_permissions (role_id, permission_id),
        CONSTRAINT fk_auth_role_permissions_role FOREIGN KEY (role_id) REFERENCES auth_roles(id),
        CONSTRAINT fk_auth_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES auth_permissions(id)
      )
    `
  )

  await runReviewDbTransaction(async (connection) => {
    for (const role of seeds.roles) {
      await connection.query(
        `
          INSERT IGNORE INTO auth_roles (code, name)
          VALUES (?, ?)
        `,
        [role.code, role.name],
      )
    }

    for (const perm of seeds.permissions) {
      await connection.query(
        `
          INSERT IGNORE INTO auth_permissions (code, name)
          VALUES (?, ?)
        `,
        [perm.code, perm.name],
      )
    }

    const roleCodes = seeds.roles.map((role) => role.code)
    const [roleRows] = await connection.query(
      `
        SELECT id, code
        FROM auth_roles
        WHERE code IN (${roleCodes.map(() => '?').join(',')})
      `,
      roleCodes,
    )

    const [permissionRows] = await connection.query(`
      SELECT id, code
      FROM auth_permissions
    `)

    const roleItems = (roleRows as { id: number; code: string }[]).map((row) => ({
      id: Number(row.id),
      code: String(row.code),
    }))
    const permissionItems = (permissionRows as { id: number; code: string }[]).map((row) => ({
      id: Number(row.id),
      code: String(row.code),
    }))

    const permissionByCode = new Map(permissionItems.map((row) => [row.code, row.id]))

    for (const role of seeds.roles) {
      const roleId = roleItems.find((item) => item.code.trim().toUpperCase() === role.code)?.id
      if (!roleId) continue

      const permissionCodes = [
        ...getBaselineAllowedPrefixes(role.code).map((prefix) => buildRoutePrefixPermissionCode(prefix)),
        ...getBaselinePermissionMatrix(role.code).flatMap((entry) =>
          entry.actions.map((action) => buildResourceActionPermissionCode(entry.resource, action)),
        ),
      ]

      for (const code of permissionCodes) {
        const permissionId = permissionByCode.get(code)
        if (!permissionId) continue
        await connection.query(
          `
            INSERT IGNORE INTO auth_role_permissions (role_id, permission_id)
            VALUES (?, ?)
          `,
          [roleId, permissionId],
        )
      }
    }
  })

  invalidateAccessControlCache()
  await recordAuthPermissionAudit({
    actionType: 'BOOTSTRAP',
    actor,
    targetCode: 'auth_permissions',
    detail: `Bootstrap permission master dan role-permissions dibuat dari baseline aplikasi (${seeds.permissions.length} permissions).`,
  }).catch(() => null)
  for (const role of seeds.roles) {
    await recordAuthRolePermissionAudit({
      actionType: 'BOOTSTRAP',
      actor,
      roleCode: role.code,
      detail: 'Bootstrap role-permissions dari baseline aplikasi.',
    }).catch(() => null)
  }

  return {
    roleCount: seeds.roles.length,
    permissionCount: seeds.permissions.length,
  }
}

export async function upsertPermission(params: { code: string; name: string; actor: string }) {
  const code = normalizePermissionCode(params.code)
  const name = String(params.name ?? '').trim()
  if (!code || !/^[a-z0-9:_/-]{3,120}$/i.test(code)) {
    throw new Error('Kode permission tidak valid.')
  }
  if (!name) {
    throw new Error('Nama permission wajib diisi.')
  }

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO auth_permissions (code, name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `,
    [code, name]
  )

  invalidateAccessControlCache()
  await recordAuthPermissionAudit({
    actionType: 'UPDATE',
    actor: params.actor,
    targetCode: code,
    detail: `Permission disimpan/diupdate: ${name}`,
  }).catch(() => null)

  return result
}
