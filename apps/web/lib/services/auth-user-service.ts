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
    return {
      source,
      users,
      summary: buildSummary(users),
    }
  }

  try {
    const users = await getReviewDbUsers()
    return {
      source,
      users,
      summary: buildSummary(users),
    }
  } catch (error) {
    const users = mapMockUsers()
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      users,
      summary: buildSummary(users),
    }
  }
}
