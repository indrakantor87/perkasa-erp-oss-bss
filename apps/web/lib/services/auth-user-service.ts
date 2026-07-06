import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { mockAuthUsers } from '@/lib/auth-session'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type ReviewAuthUserRow = {
  id: number
  fullName: string
  username: string
  email: string | null
  roleCode: string
  divisionName: string | null
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
  roleLabel: string
  divisionLabel: string
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
  if (['ADMIN', 'ADMIN_CS'].includes(normalized)) return 'Admin Divisi'
  if (['OPERATOR', 'SUPPORT_OPS', 'SUPPORT_OPERATOR', 'NOC'].includes(normalized)) return 'Operator'
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
    roleLabel: formatRoleLabel(user.role),
    divisionLabel: getMockDivisionLabel(user.username),
    branchLabel: 'Cabang Pati',
    status: 'ACTIVE',
    source: 'mock',
  }))
}

function mapMockLookupOptions() {
  return {
    roleOptions: [
      { id: '1', code: 'SUPER_ADMIN', label: 'Super Admin' },
      { id: '2', code: 'ADMIN_CS', label: 'Admin CS' },
      { id: '3', code: 'OPERATOR', label: 'Operator' },
    ],
    divisionOptions: [
      { id: '1', code: 'CS', label: 'CS' },
      { id: '2', code: 'NOC', label: 'NOC' },
      { id: '3', code: 'PENJUALAN', label: 'Penjualan' },
    ],
    branchOptions: [{ id: '1', code: 'PATI', label: 'Cabang Pati' }],
  }
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
        ar.code AS roleCode,
        od.name AS divisionName,
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
          WHEN ar.code IN ('ADMIN', 'ADMIN_CS') THEN 2
          ELSE 3
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
    roleLabel: formatRoleLabel(row.roleCode),
    divisionLabel: row.divisionName?.trim() || 'Semua Divisi',
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
            WHEN code IN ('ADMIN', 'ADMIN_CS') THEN 2
            WHEN code IN ('OPERATOR', 'NOC') THEN 3
            ELSE 4
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
    adminUsers: users.filter((user) => ['Super Admin', 'Admin Divisi'].includes(user.roleLabel)).length,
    operatorUsers: users.filter((user) => user.roleLabel === 'Operator').length,
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
      ...lookupOptions,
    }
  }

  try {
    const [users, lookupOptions] = await Promise.all([getReviewDbUsers(), getReviewDbLookupOptions()])
    return {
      source,
      users,
      summary: buildSummary(users),
      ...lookupOptions,
    }
  } catch (error) {
    const users = mapMockUsers()
    const lookupOptions = mapMockLookupOptions()
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      users,
      summary: buildSummary(users),
      ...lookupOptions,
    }
  }
}
