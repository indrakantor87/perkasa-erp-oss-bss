import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { mockAuthUsers } from '@/lib/auth-session'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { getRecentAuthUserAudits } from '@/lib/services/auth-user-audit-service'
import type { AuthUserAuditItem } from '@/lib/types'

type ReviewAuthUserRow = {
  id: number
  fullName: string
  username: string
  email: string | null
  roleId: number | null
  roleCode: string
  divisionId: number | null
  divisionName: string | null
  branchId: number | null
  branchName: string | null
  status: string
}

type ReviewLookupRow = {
  id: number
  code: string
  name: string
}

export type AuthUserListItem = {
  id: string
  fullName: string
  username: string
  email: string
  roleId: string | null
  roleCode: string
  roleLabel: string
  divisionId: string | null
  divisionLabel: string
  branchId: string | null
  branchLabel: string
  status: string
  source: 'review-db' | 'mock'
}

export type AuthUserLookupOption = {
  id: string
  code: string
  label: string
}

function formatRoleLabel(roleCode: string) {
  const normalized = roleCode.trim().toUpperCase()
  if (normalized === 'SUPER_ADMIN') return 'Super Admin'
  if (normalized === 'SALES_MARKETING' || normalized === 'MARKETING') return 'Sales Marketing'
  if (normalized === 'CS_OPERATOR' || normalized === 'CS') return 'CS Operator'
  if (normalized === 'CS_ADMIN' || ['ADMIN', 'ADMIN_CS'].includes(normalized)) return 'CS Admin'
  if (normalized === 'NOC_OPERATOR' || ['OPERATOR', 'SUPPORT_OPS', 'SUPPORT_OPERATOR', 'NOC'].includes(normalized))
    return 'NOC Operator'
  if (normalized === 'FIELD_TECHNICIAN' || normalized === 'TEKNISI') return 'Field Technician'
  if (normalized === 'TT_OPERATOR' || normalized === 'TROUBLESHOOTS') return 'Trouble Ticket Operator'
  if (normalized === 'DIGITAL_CREATOR' || normalized === 'CREATOR_DIGITAL') return 'Digital Creator'
  if (normalized === 'DISMANTLE_OPERATOR' || normalized === 'DISMANTLE') return 'Dismantle Operator'
  return roleCode
}

function getMockDivisionLabel(username: string) {
  if (username === 'cs.review') return 'CS'
  if (username === 'support.ops') return 'NOC'
  return 'Semua Divisi'
}

function mapMockUsers(): AuthUserListItem[] {
  return mockAuthUsers.map((user) => ({
    id: `mock-${user.username}`,
    fullName: user.displayName,
    username: user.username,
    email: '-',
    roleId: null,
    roleCode: user.role,
    roleLabel: formatRoleLabel(user.role),
    divisionId: null,
    divisionLabel: getMockDivisionLabel(user.username),
    branchId: null,
    branchLabel: 'Cabang Pati',
    status: 'ACTIVE',
    source: 'mock',
  }))
}

function mapMockLookupOptions() {
  return {
    roleOptions: [
      { id: '1', code: 'SUPER_ADMIN', label: 'Super Admin' },
      { id: '2', code: 'SALES_MARKETING', label: 'Sales Marketing' },
      { id: '3', code: 'CS_OPERATOR', label: 'CS Operator' },
      { id: '4', code: 'CS_ADMIN', label: 'CS Admin' },
      { id: '5', code: 'NOC_OPERATOR', label: 'NOC Operator' },
      { id: '6', code: 'FIELD_TECHNICIAN', label: 'Field Technician' },
      { id: '7', code: 'TT_OPERATOR', label: 'Trouble Ticket Operator' },
      { id: '8', code: 'DIGITAL_CREATOR', label: 'Digital Creator' },
      { id: '9', code: 'DISMANTLE_OPERATOR', label: 'Dismantle Operator' },
    ],
    divisionOptions: [
      { id: '1', code: 'CS', label: 'CS' },
      { id: '2', code: 'NOC', label: 'NOC' },
      { id: '3', code: 'PENJUALAN', label: 'Penjualan' },
      { id: '4', code: 'CREATOR_DIGITAL', label: 'Creator Digital' },
    ],
    branchOptions: [{ id: '1', code: 'PATI', label: 'Cabang Pati' }],
  }
}

function mapMockAudits(): AuthUserAuditItem[] {
  return [
    {
      id: 'mock-audit-create-admin',
      actionType: 'CREATE',
      actor: 'System Review',
      targetUser: 'admin.perkasa',
      detail: 'Akun bootstrap admin tersedia untuk menjaga alur review tetap hidup.',
      happenedAt: '2026-07-06 09:00',
    },
    {
      id: 'mock-audit-create-cs',
      actionType: 'CREATE',
      actor: 'System Review',
      targetUser: 'cs.review',
      detail: 'Akun bootstrap CS disediakan sebagai fallback saat review DB auth belum siap penuh.',
      happenedAt: '2026-07-06 09:05',
    },
  ]
}

function mapLookupRows(rows: ReviewLookupRow[]) {
  return rows.map<AuthUserLookupOption>((row) => ({
    id: String(row.id),
    code: row.code,
    label: row.name,
  }))
}

async function getReviewDbUsers() {
  const rows = await runReviewDbQuery<ReviewAuthUserRow>(
    `
      SELECT
        au.id AS id,
        au.full_name AS fullName,
        au.username AS username,
        au.email AS email,
        ar.id AS roleId,
        ar.code AS roleCode,
        od.id AS divisionId,
        od.name AS divisionName,
        ob.id AS branchId,
        ob.name AS branchName,
        au.status AS status
      FROM auth_users au
      JOIN auth_roles ar
        ON ar.id = au.role_id
      LEFT JOIN org_divisions od
        ON od.id = au.division_id
      LEFT JOIN org_branches ob
        ON ob.id = au.branch_id
      ORDER BY
        CASE
          WHEN ar.code = 'SUPER_ADMIN' THEN 1
          WHEN ar.code IN ('CS_ADMIN', 'ADMIN_CS') THEN 2
          WHEN ar.code IN ('CS_OPERATOR', 'CS') THEN 3
          WHEN ar.code IN ('SALES_MARKETING', 'MARKETING') THEN 4
          WHEN ar.code IN ('NOC_OPERATOR', 'NOC') THEN 5
          WHEN ar.code IN ('FIELD_TECHNICIAN', 'TEKNISI') THEN 6
          WHEN ar.code IN ('TT_OPERATOR', 'TROUBLESHOOTS', 'SUPPORT_OPS', 'SUPPORT_OPERATOR', 'OPERATOR') THEN 7
          WHEN ar.code IN ('DISMANTLE_OPERATOR', 'DISMANTLE') THEN 8
          WHEN ar.code IN ('DIGITAL_CREATOR', 'CREATOR_DIGITAL') THEN 9
          ELSE 10
        END,
        au.full_name ASC,
        au.id ASC
    `
  )

  return rows.map<AuthUserListItem>((row) => ({
    id: String(row.id),
    fullName: row.fullName,
    username: row.username,
    email: row.email?.trim() || '-',
    roleId: row.roleId == null ? null : String(row.roleId),
    roleCode: row.roleCode,
    roleLabel: formatRoleLabel(row.roleCode),
    divisionId: row.divisionId == null ? null : String(row.divisionId),
    divisionLabel: row.divisionName?.trim() || 'Semua Divisi',
    branchId: row.branchId == null ? null : String(row.branchId),
    branchLabel: row.branchName?.trim() || 'Tanpa Cabang',
    status: row.status,
    source: 'review-db',
  }))
}

async function getReviewDbLookupOptions() {
  const [roles, divisions, branches] = await Promise.all([
    runReviewDbQuery<ReviewLookupRow>(
      `
        SELECT id, code, name
        FROM auth_roles
        ORDER BY
          CASE
            WHEN code = 'SUPER_ADMIN' THEN 1
            WHEN code IN ('SALES_MARKETING', 'MARKETING') THEN 2
            WHEN code IN ('CS_OPERATOR', 'CS') THEN 3
            WHEN code IN ('CS_ADMIN', 'ADMIN_CS') THEN 4
            WHEN code IN ('NOC_OPERATOR', 'NOC') THEN 5
            WHEN code IN ('FIELD_TECHNICIAN', 'TEKNISI') THEN 6
            WHEN code IN ('TT_OPERATOR', 'TROUBLESHOOTS', 'SUPPORT_OPS', 'SUPPORT_OPERATOR', 'OPERATOR') THEN 7
            WHEN code IN ('DIGITAL_CREATOR', 'CREATOR_DIGITAL') THEN 8
            WHEN code IN ('DISMANTLE_OPERATOR', 'DISMANTLE') THEN 9
            ELSE 10
          END,
          name ASC,
          id ASC
      `
    ),
    runReviewDbQuery<ReviewLookupRow>(
      `
        SELECT id, code, name
        FROM org_divisions
        ORDER BY name ASC, id ASC
      `
    ),
    runReviewDbQuery<ReviewLookupRow>(
      `
        SELECT id, code, name
        FROM org_branches
        ORDER BY name ASC, id ASC
      `
    ),
  ])

  return {
    roleOptions: mapLookupRows(roles),
    divisionOptions: mapLookupRows(divisions),
    branchOptions: mapLookupRows(branches),
  }
}

function buildSummary(users: AuthUserListItem[]) {
  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === 'ACTIVE').length,
    adminUsers: users.filter((user) => ['Super Admin', 'CS Admin'].includes(user.roleLabel)).length,
    operatorUsers: users.filter((user) =>
      ['CS Operator', 'NOC Operator', 'Field Technician', 'Trouble Ticket Operator', 'Dismantle Operator'].includes(
        user.roleLabel
      )
    ).length,
  }
}

export async function getAuthUsersPageData() {
  const source = getDataSourceSnapshot()

  if (source.effectiveMode !== 'review-db') {
    const users = mapMockUsers()
    const lookupOptions = mapMockLookupOptions()
    return {
      source,
      users,
      summary: buildSummary(users),
      auditItems: mapMockAudits(),
      ...lookupOptions,
    }
  }

  try {
    const [users, lookupOptions, auditItems] = await Promise.all([
      getReviewDbUsers(),
      getReviewDbLookupOptions(),
      getRecentAuthUserAudits().catch(() => []),
    ])
    return {
      source,
      users,
      summary: buildSummary(users),
      auditItems,
      ...lookupOptions,
    }
  } catch (error) {
    const users = mapMockUsers()
    const lookupOptions = mapMockLookupOptions()
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      users,
      summary: buildSummary(users),
      auditItems: mapMockAudits(),
      ...lookupOptions,
    }
  }
}
