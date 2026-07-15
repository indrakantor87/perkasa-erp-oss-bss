import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { mockAuthUsers } from '@/lib/auth-session'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { getRecentAuthUserAudits } from '@/lib/services/auth-user-audit-service'
import { getDailyActivityUserProfiles } from '@/lib/services/daily-activity-user-profile-service'
import type { AuthUserAuditItem } from '@/lib/types'

type ReviewAuthUserRow = {
  id: number
  fullName: string
  username: string
  email: string | null
  roleId: number | null
  roleCode: string
  divisionId: number | null
  divisionCode: string | null
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

const FINAL_AUTH_ROLE_CODES = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'HR',
  'GA',
  'PENJUALAN',
  'CS',
  'NOC',
  'TROUBLESHOOTS',
  'CREATOR_DIGITAL',
  'DISMANTLE',
  'TEKNISI_PSB',
] as const

const FINAL_DIVISION_CODES = [
  'PEMASARAN_PELAYANAN',
  'FINANCE_HR',
  'GENERAL_AFFAIR',
  'TEKNIS_EKSPAN',
  'OPERASIONAL',
] as const

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

function resolveFinalRoleCode(roleCode: string) {
  const normalized = roleCode.trim().toUpperCase()
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'FINANCE') return 'FINANCE'
  if (normalized === 'HR') return 'HR'
  if (normalized === 'GA' || normalized === 'WAREHOUSE') return 'GA'
  if (normalized === 'PENJUALAN' || normalized === 'SALES_MARKETING' || normalized === 'MARKETING' || normalized === 'SALES')
    return 'PENJUALAN'
  if (normalized === 'CS_OPERATOR' || normalized === 'CS' || normalized === 'CS_ADMIN' || normalized === 'ADMIN_CS')
    return 'CS'
  if (normalized === 'NOC_OPERATOR' || ['OPERATOR', 'SUPPORT_OPS', 'SUPPORT_OPERATOR', 'NOC'].includes(normalized))
    return 'NOC'
  if (normalized === 'FIELD_TECHNICIAN' || normalized === 'TEKNISI' || normalized === 'TEKNISI_PSB') return 'TEKNISI_PSB'
  if (normalized === 'TT_OPERATOR' || normalized === 'TROUBLESHOOTS') return 'TROUBLESHOOTS'
  if (normalized === 'DIGITAL_CREATOR' || normalized === 'CREATOR_DIGITAL') return 'CREATOR_DIGITAL'
  if (normalized === 'DISMANTLE_OPERATOR' || normalized === 'DISMANTLE') return 'DISMANTLE'
  if (normalized === 'HR_GA') return 'HR'
  return normalized
}

function formatRoleLabel(roleCode: string) {
  const normalized = resolveFinalRoleCode(roleCode)
  if (normalized === 'OWNER') return 'Owner'
  if (normalized === 'SUPER_ADMIN') return 'Super Admin'
  if (normalized === 'ADMIN') return 'Admin'
  if (normalized === 'FINANCE') return 'Finance'
  if (normalized === 'HR') return 'HR'
  if (normalized === 'GA') return 'GA'
  if (normalized === 'PENJUALAN') return 'Penjualan'
  if (normalized === 'CS') return 'Customer Service'
  if (normalized === 'NOC') return 'NOC'
  if (normalized === 'TEKNISI_PSB') return 'Teknisi PSB'
  if (normalized === 'TROUBLESHOOTS') return 'Troubleshoots'
  if (normalized === 'CREATOR_DIGITAL') return 'Creator Digital'
  if (normalized === 'DISMANTLE') return 'Dismantle'
  return roleCode
}

function formatDivisionLabel(divisionCode: string) {
  const normalized = divisionCode.trim().toUpperCase()
  if (normalized === 'PEMASARAN_PELAYANAN') return 'Pemasaran dan Pelayanan'
  if (normalized === 'FINANCE_HR') return 'Finance & HR'
  if (normalized === 'GENERAL_AFFAIR') return 'General Affair'
  if (normalized === 'TEKNIS_EKSPAN') return 'Teknis & Ekspan'
  if (normalized === 'OPERASIONAL') return 'Operasional'
  if (normalized === 'CS_ADMIN') return 'Pemasaran dan Pelayanan'
  if (normalized === 'HR_GA') return 'Finance & HR'
  if (normalized === 'NOC_TROUBLESHOOTS') return 'Pemasaran dan Pelayanan'
  if (normalized === 'WAREHOUSE') return 'General Affair'
  return divisionCode
}

function getMockDivisionLabel(username: string) {
  if (username === 'cs.review') return 'Pemasaran dan Pelayanan'
  if (username === 'support.ops') return 'Pemasaran dan Pelayanan'
  return 'Operasional'
}

function resolveDivisionLabel(params: {
  divisionCode?: string | null
  divisionName?: string | null
  roleCode?: string | null
}) {
  const normalizedDivisionCode = String(params.divisionCode ?? '')
    .trim()
    .toUpperCase()
  if (normalizedDivisionCode) {
    return formatDivisionLabel(normalizedDivisionCode)
  }

  const normalizedDivisionName = String(params.divisionName ?? '')
    .trim()
    .toUpperCase()

  if (
    ['PENJUALAN', 'CUSTOMER SERVICE', 'CS', 'NOC', 'TROUBLESHOOTS', 'CREATOR DIGITAL', 'DIGITAL CREATOR'].includes(
      normalizedDivisionName
    )
  ) {
    return 'Pemasaran dan Pelayanan'
  }
  if (['FINANCE', 'HR', 'HR & GA'].includes(normalizedDivisionName)) {
    return 'Finance & HR'
  }
  if (['GENERAL AFFAIR', 'GA', 'WAREHOUSE'].includes(normalizedDivisionName)) {
    return 'General Affair'
  }
  if (['TEKNIS & EKSPAN', 'TEKNIS_EKSPAN', 'TEKNISI PSB', 'DISMANTLE'].includes(normalizedDivisionName)) {
    return 'Teknis & Ekspan'
  }
  if (['OPERASIONAL', 'OPERATIONAL'].includes(normalizedDivisionName)) {
    return 'Operasional'
  }

  const normalizedRoleCode = resolveFinalRoleCode(String(params.roleCode ?? ''))
  if (['PENJUALAN', 'CS', 'CREATOR_DIGITAL', 'NOC', 'TROUBLESHOOTS'].includes(normalizedRoleCode)) {
    return 'Pemasaran dan Pelayanan'
  }
  if (['FINANCE', 'HR'].includes(normalizedRoleCode)) {
    return 'Finance & HR'
  }
  if (normalizedRoleCode === 'GA') {
    return 'General Affair'
  }
  if (['TEKNISI_PSB', 'DISMANTLE'].includes(normalizedRoleCode)) {
    return 'Teknis & Ekspan'
  }
  if (['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedRoleCode)) {
    return 'Operasional'
  }

  return params.divisionName?.trim() || 'Semua Divisi'
}

function mapMockUsers(): AuthUserListItem[] {
  return mockAuthUsers.map((user) => ({
    id: `mock-${user.username}`,
    fullName: user.displayName,
    username: user.username,
    email: '-',
    roleId: null,
    roleCode: resolveFinalRoleCode(user.role),
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
      { id: '1', code: 'OWNER', label: 'Owner' },
      { id: '2', code: 'SUPER_ADMIN', label: 'Super Admin' },
      { id: '3', code: 'ADMIN', label: 'Admin' },
      { id: '4', code: 'FINANCE', label: 'Finance' },
      { id: '5', code: 'HR', label: 'HR' },
      { id: '6', code: 'GA', label: 'GA' },
      { id: '7', code: 'PENJUALAN', label: 'Penjualan' },
      { id: '8', code: 'CS', label: 'Customer Service' },
      { id: '9', code: 'NOC', label: 'NOC' },
      { id: '10', code: 'TROUBLESHOOTS', label: 'Troubleshoots' },
      { id: '11', code: 'CREATOR_DIGITAL', label: 'Creator Digital' },
      { id: '12', code: 'DISMANTLE', label: 'Dismantle' },
      { id: '13', code: 'TEKNISI_PSB', label: 'Teknisi PSB' },
    ],
    divisionOptions: [
      { id: '1', code: 'PEMASARAN_PELAYANAN', label: 'Pemasaran dan Pelayanan' },
      { id: '2', code: 'FINANCE_HR', label: 'Finance & HR' },
      { id: '3', code: 'GENERAL_AFFAIR', label: 'General Affair' },
      { id: '4', code: 'TEKNIS_EKSPAN', label: 'Teknis & Ekspan' },
      { id: '5', code: 'OPERASIONAL', label: 'Operasional' },
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

function buildFinalRoleOptions(rows: ReviewLookupRow[]) {
  const roleByCode = new Map(
    rows.map((row) => [row.code.trim().toUpperCase(), row] as const)
  )

  return FINAL_AUTH_ROLE_CODES.map<AuthUserLookupOption>((code) => {
    const existing = roleByCode.get(code)
    return {
      id: existing ? String(existing.id) : code,
      code,
      label: formatRoleLabel(code),
    }
  })
}

function buildFinalDivisionOptions(rows: ReviewLookupRow[]) {
  const divisionByCode = new Map(
    rows.map((row) => [row.code.trim().toUpperCase(), row] as const)
  )

  return FINAL_DIVISION_CODES.map<AuthUserLookupOption>((code) => {
    const existing = divisionByCode.get(code)
    return {
      id: existing ? String(existing.id) : code,
      code,
      label: formatDivisionLabel(code),
    }
  })
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
        od.code AS divisionCode,
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

  return rows.map<AuthUserListItem>((row) => {
    const finalRoleCode = resolveFinalRoleCode(row.roleCode)
    return {
      id: String(row.id),
      fullName: row.fullName,
      username: row.username,
      email: row.email?.trim() || '-',
      roleId: row.roleId == null ? null : String(row.roleId),
      roleCode: finalRoleCode,
      roleLabel: formatRoleLabel(finalRoleCode),
      divisionId: row.divisionId == null ? null : String(row.divisionId),
      divisionLabel: resolveDivisionLabel({
        divisionCode: row.divisionCode,
        divisionName: row.divisionName,
        roleCode: finalRoleCode,
      }),
      branchId: row.branchId == null ? null : String(row.branchId),
      branchLabel: row.branchName?.trim() || 'Tanpa Cabang',
      status: row.status,
      source: 'review-db',
    }
  })
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
    roleOptions: buildFinalRoleOptions(roles),
    divisionOptions: buildFinalDivisionOptions(divisions),
    branchOptions: mapLookupRows(branches),
  }
}

function buildSummary(users: AuthUserListItem[]) {
  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === 'ACTIVE').length,
    adminUsers: users.filter((user) => ['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(resolveFinalRoleCode(user.roleCode))).length,
    operatorUsers: users.filter((user) =>
      ['CS', 'NOC', 'TEKNISI_PSB', 'TROUBLESHOOTS', 'DISMANTLE'].includes(resolveFinalRoleCode(user.roleCode))
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
      dailyActivityProfiles: [],
      ...lookupOptions,
    }
  }

  try {
    const [users, lookupOptions, auditItems, dailyActivityProfiles] = await Promise.all([
      getReviewDbUsers(),
      getReviewDbLookupOptions(),
      getRecentAuthUserAudits().catch(() => []),
      getDailyActivityUserProfiles(),
    ])
    return {
      source,
      users,
      summary: buildSummary(users),
      auditItems,
      dailyActivityProfiles,
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
      dailyActivityProfiles: [],
      ...lookupOptions,
    }
  }
}
