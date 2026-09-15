import type { AppRole } from '@/lib/types'
import type { AppSession } from '@/lib/auth-session'
import {
  runReviewDbQuery,
  runReviewDbExecute,
  runReviewDbTransaction,
  isReviewDbConfigured,
  invalidateReviewDbColumnCache,
  invalidateReviewDbTableCache,
} from '@/lib/review-db'

export const SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME = 'sales_team_memberships' as const

export type SalesTeamMembershipStatus = 'ACTIVE' | 'INACTIVE'

export type SalesTeamMembership = {
  id: number
  spvUserId: number
  memberUserId: number
  active: 1 | 0
  createdAt: string
  updatedAt: string
  createdByUserId: number | null
  deactivatedByUserId: number | null
  deactivatedAt: string | null
  deactivationReason: string | null
  reactivatedByUserId: number | null
  reactivatedAt: string | null
}

export type AuthUserRefLite = {
  userId: number
  roleCode: string
  branchId: number | null
  status: 'ACTIVE' | 'INACTIVE' | string
}

export type MembershipValidationError =
  | 'SELF_ASSIGNMENT_NOT_ALLOWED'
  | 'SPV_ROLE_INVALID'
  | 'MEMBER_ROLE_INVALID'
  | 'SPV_NOT_ACTIVE'
  | 'MEMBER_NOT_ACTIVE'
  | 'BRANCH_MISMATCH'
  | 'MEMBER_ALREADY_HAS_ACTIVE_SPV'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'REACTIVATE_VALIDATION_FAILED'
  | 'REACTIVATE_DUPLICATE_ACTIVE_SPV'

export type MembershipValidationResult = {
  valid: true
} | {
  valid: false
  error: MembershipValidationError
  detail?: string
}

export const SALES_SPV_VALID_ROLES: readonly AppRole[] = ['SPV_SALES'] as const
export const SALES_MEMBER_VALID_ROLES: readonly AppRole[] = ['PENJUALAN', 'SALES_MARKETING'] as const

export const SALES_SPV_VALID_ROLE_SET: ReadonlySet<AppRole> = new Set(SALES_SPV_VALID_ROLES)
export const SALES_MEMBER_VALID_ROLE_SET: ReadonlySet<AppRole> = new Set(SALES_MEMBER_VALID_ROLES)

export function normalizeRoleCode(input: unknown): string {
  return String(input ?? '').trim().toUpperCase()
}

export function isActiveStatus(status: unknown): boolean {
  return String(status ?? '').trim().toUpperCase() === 'ACTIVE'
}

export function isNotSelfAssign(spvUserId: unknown, memberUserId: unknown): boolean {
  const spv = Number(spvUserId)
  const member = Number(memberUserId)
  if (!Number.isFinite(spv) || !Number.isFinite(member)) return false
  return spv !== member
}

export function isValidSpvRoleCode(roleCode: unknown): boolean {
  const normalized = normalizeRoleCode(roleCode)
  return SALES_SPV_VALID_ROLE_SET.has(normalized as AppRole)
}

export function isValidMemberRoleCode(roleCode: unknown): boolean {
  const normalized = normalizeRoleCode(roleCode)
  return SALES_MEMBER_VALID_ROLE_SET.has(normalized as AppRole)
}

export function isSameBranch(
  spvBranchId: unknown,
  memberBranchId: unknown,
): boolean {
  if (spvBranchId === null || spvBranchId === undefined) return false
  if (memberBranchId === null || memberBranchId === undefined) return false
  const s = Number(spvBranchId)
  const m = Number(memberBranchId)
  if (!Number.isFinite(s) || !Number.isFinite(m)) return false
  return s === m
}

export function validateMembershipPairPure(params: {
  spv: AuthUserRefLite
  member: AuthUserRefLite
}): MembershipValidationResult {
  if (!isNotSelfAssign(params.spv.userId, params.member.userId)) {
    return { valid: false, error: 'SELF_ASSIGNMENT_NOT_ALLOWED', detail: 'spv_user_id tidak boleh sama dengan member_user_id' }
  }
  if (!isValidSpvRoleCode(params.spv.roleCode)) {
    return { valid: false, error: 'SPV_ROLE_INVALID', detail: 'SPV harus memiliki role SPV_SALES' }
  }
  if (!isValidMemberRoleCode(params.member.roleCode)) {
    return { valid: false, error: 'MEMBER_ROLE_INVALID', detail: 'Member harus memiliki role PENJUALAN atau SALES_MARKETING' }
  }
  if (isValidMemberRoleCode(params.spv.roleCode)) {
    return { valid: false, error: 'SPV_ROLE_INVALID', detail: 'Role member (PENJUALAN/SALES_MARKETING) tidak boleh menjadi SPV' }
  }
  if (isValidSpvRoleCode(params.member.roleCode)) {
    return { valid: false, error: 'MEMBER_ROLE_INVALID', detail: 'Role SPV_SALES tidak boleh menjadi member tim' }
  }
  if (!isActiveStatus(params.spv.status)) {
    return { valid: false, error: 'SPV_NOT_ACTIVE', detail: 'User SPV tidak aktif' }
  }
  if (!isActiveStatus(params.member.status)) {
    return { valid: false, error: 'MEMBER_NOT_ACTIVE', detail: 'User member tidak aktif' }
  }
  if (!isSameBranch(params.spv.branchId, params.member.branchId)) {
    return { valid: false, error: 'BRANCH_MISMATCH', detail: 'SPV dan member harus berada di cabang yang sama' }
  }
  return { valid: true }
}

export async function fetchAuthUserRefLite(userId: number): Promise<AuthUserRefLite | null> {
  if (!Number.isFinite(userId) || userId <= 0) return null
  const rows = await runReviewDbQuery<{
    userId: number
    roleCode: string
    branchId: number | null
    status: string
  }>(
    `
      SELECT
        au.id AS userId,
        ar.code AS roleCode,
        au.branch_id AS branchId,
        au.status AS status
      FROM auth_users au
      INNER JOIN auth_roles ar
        ON ar.id = au.role_id
      WHERE au.id = ?
      LIMIT 1
    `,
    [userId],
  )
  const row = rows[0]
  if (!row) return null
  return {
    userId: Number(row.userId),
    roleCode: normalizeRoleCode(row.roleCode),
    branchId: row.branchId === null || row.branchId === undefined ? null : Number(row.branchId),
    status: String(row.status ?? '').trim().toUpperCase() || 'INACTIVE',
  }
}

export async function findActiveSpvForMember(memberUserId: number): Promise<SalesTeamMembership | null> {
  if (!Number.isFinite(memberUserId) || memberUserId <= 0) return null
  const rows = await runReviewDbQuery<SalesTeamMembership>(
    `
      SELECT
        id,
        spv_user_id AS spvUserId,
        member_user_id AS memberUserId,
        active,
        created_at AS createdAt,
        updated_at AS updatedAt,
        created_by_user_id AS createdByUserId,
        deactivated_by_user_id AS deactivatedByUserId,
        deactivated_at AS deactivatedAt,
        deactivation_reason AS deactivationReason,
        reactivated_by_user_id AS reactivatedByUserId,
        reactivated_at AS reactivatedAt
      FROM ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      WHERE member_user_id = ?
        AND active = 1
      LIMIT 1
    `,
    [memberUserId],
  )
  return rows[0] ?? null
}

export async function listActiveMembersForSpv(spvUserId: number): Promise<SalesTeamMembership[]> {
  if (!Number.isFinite(spvUserId) || spvUserId <= 0) return []
  const rows = await runReviewDbQuery<SalesTeamMembership>(
    `
      SELECT
        id,
        spv_user_id AS spvUserId,
        member_user_id AS memberUserId,
        active,
        created_at AS createdAt,
        updated_at AS updatedAt,
        created_by_user_id AS createdByUserId,
        deactivated_by_user_id AS deactivatedByUserId,
        deactivated_at AS deactivatedAt,
        deactivation_reason AS deactivationReason,
        reactivated_by_user_id AS reactivatedByUserId,
        reactivated_at AS reactivatedAt
      FROM ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      WHERE spv_user_id = ?
        AND active = 1
      ORDER BY member_user_id ASC
    `,
    [spvUserId],
  )
  return rows
}

export async function findHistoricalMembership(spvUserId: number, memberUserId: number): Promise<SalesTeamMembership | null> {
  if (!Number.isFinite(spvUserId) || !Number.isFinite(memberUserId)) return null
  const rows = await runReviewDbQuery<SalesTeamMembership>(
    `
      SELECT
        id,
        spv_user_id AS spvUserId,
        member_user_id AS memberUserId,
        active,
        created_at AS createdAt,
        updated_at AS updatedAt,
        created_by_user_id AS createdByUserId,
        deactivated_by_user_id AS deactivatedByUserId,
        deactivated_at AS deactivatedAt,
        deactivation_reason AS deactivationReason,
        reactivated_by_user_id AS reactivatedByUserId,
        reactivated_at AS reactivatedAt
      FROM ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      WHERE spv_user_id = ?
        AND member_user_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [spvUserId, memberUserId],
  )
  return rows[0] ?? null
}

export type CreateMembershipParams = {
  spvUserId: number
  memberUserId: number
  actorUserId: number | null
}

export type CreateMembershipResult = {
  success: true
  membershipId: number
} | {
  success: false
  error: MembershipValidationError
  detail?: string
}

export async function createSalesTeamMembership(params: CreateMembershipParams): Promise<CreateMembershipResult> {
  const spvUserId = Number(params.spvUserId)
  const memberUserId = Number(params.memberUserId)
  if (!Number.isFinite(spvUserId) || spvUserId <= 0) return { success: false, error: 'SPV_ROLE_INVALID', detail: 'spv_user_id tidak valid' }
  if (!Number.isFinite(memberUserId) || memberUserId <= 0) return { success: false, error: 'MEMBER_ROLE_INVALID', detail: 'member_user_id tidak valid' }

  if (!isNotSelfAssign(spvUserId, memberUserId)) {
    return { success: false, error: 'SELF_ASSIGNMENT_NOT_ALLOWED', detail: 'spv_user_id tidak boleh sama dengan member_user_id' }
  }

  const [spv, member, existingActiveSpv] = await Promise.all([
    fetchAuthUserRefLite(spvUserId),
    fetchAuthUserRefLite(memberUserId),
    findActiveSpvForMember(memberUserId),
  ])

  if (!spv) return { success: false, error: 'SPV_ROLE_INVALID', detail: 'User SPV tidak ditemukan' }
  if (!member) return { success: false, error: 'MEMBER_ROLE_INVALID', detail: 'User member tidak ditemukan' }

  const pureCheck = validateMembershipPairPure({ spv, member })
  if (!pureCheck.valid) return { success: false, error: pureCheck.error, detail: pureCheck.detail }

  if (existingActiveSpv) {
    return { success: false, error: 'MEMBER_ALREADY_HAS_ACTIVE_SPV', detail: 'Member sudah memiliki SPV aktif lain' }
  }

  const actorForDb = params.actorUserId && Number.isFinite(params.actorUserId) && params.actorUserId > 0 ? Number(params.actorUserId) : null

  const insertRes = await runReviewDbExecute<{ insertId: number | bigint; affectedRows: number }>(
    `
      INSERT INTO ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
        (spv_user_id, member_user_id, active, created_by_user_id)
      VALUES
        (?, ?, 1, ?)
    `,
    [spvUserId, memberUserId, actorForDb],
  )

  const newId = Number(insertRes?.insertId ?? 0)
  if (!newId || (insertRes?.affectedRows ?? 0) <= 0) {
    return { success: false, error: 'MEMBER_ALREADY_HAS_ACTIVE_SPV', detail: 'Gagal insert membership, kemungkinan duplicate active_member_unique constraint' }
  }
  invalidateReviewDbTableCache(SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME)
  return { success: true, membershipId: newId }
}

export type DeactivateMembershipParams = {
  spvUserId: number
  memberUserId: number
  actorUserId: number | null
  reason?: string | null
}

export type DeactivateMembershipResult = {
  success: true
} | {
  success: false
  error: MembershipValidationError
  detail?: string
}

export async function deactivateSalesTeamMembership(params: DeactivateMembershipParams): Promise<DeactivateMembershipResult> {
  const spvUserId = Number(params.spvUserId)
  const memberUserId = Number(params.memberUserId)
  if (!Number.isFinite(spvUserId) || !Number.isFinite(memberUserId)) {
    return { success: false, error: 'MEMBERSHIP_NOT_FOUND', detail: 'User id tidak valid' }
  }

  const existingActive = await findActiveSpvForMember(memberUserId)
  if (!existingActive || existingActive.spvUserId !== spvUserId || existingActive.active !== 1) {
    return { success: false, error: 'MEMBERSHIP_NOT_FOUND', detail: 'Membership aktif tidak ditemukan untuk pasangan SPV dan member ini' }
  }

  const actorForDb = params.actorUserId && Number.isFinite(params.actorUserId) && params.actorUserId > 0 ? Number(params.actorUserId) : null
  const reasonForDb = params.reason !== undefined && params.reason !== null ? String(params.reason).slice(0, 500) : null

  await runReviewDbExecute(
    `
      UPDATE ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      SET
        active = 0,
        deactivated_by_user_id = ?,
        deactivated_at = CURRENT_TIMESTAMP,
        deactivation_reason = ?
      WHERE id = ?
        AND active = 1
    `,
    [actorForDb, reasonForDb, existingActive.id],
  )

  invalidateReviewDbTableCache(SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME)
  return { success: true }
}

export type ReactivateMembershipParams = {
  spvUserId: number
  memberUserId: number
  actorUserId: number | null
}

export type ReactivateMembershipResult = {
  success: true
} | {
  success: false
  error: MembershipValidationError
  detail?: string
}

export async function reactivateSalesTeamMembership(params: ReactivateMembershipParams): Promise<ReactivateMembershipResult> {
  const spvUserId = Number(params.spvUserId)
  const memberUserId = Number(params.memberUserId)
  if (!Number.isFinite(spvUserId) || !Number.isFinite(memberUserId)) {
    return { success: false, error: 'MEMBERSHIP_NOT_FOUND' }
  }

  const historical = await findHistoricalMembership(spvUserId, memberUserId)
  if (!historical) {
    return { success: false, error: 'MEMBERSHIP_NOT_FOUND', detail: 'Riwayat membership untuk pasangan ini tidak ditemukan' }
  }
  if (historical.active === 1) {
    return { success: true }
  }

  const [spv, member, existingActiveSpvOther] = await Promise.all([
    fetchAuthUserRefLite(spvUserId),
    fetchAuthUserRefLite(memberUserId),
    findActiveSpvForMember(memberUserId),
  ])

  if (!spv || !member) {
    return { success: false, error: 'REACTIVATE_VALIDATION_FAILED', detail: 'User SPV atau member tidak ditemukan saat ini' }
  }

  const pureCheck = validateMembershipPairPure({ spv, member })
  if (!pureCheck.valid) {
    return { success: false, error: 'REACTIVATE_VALIDATION_FAILED', detail: pureCheck.detail ?? String(pureCheck.error) }
  }

  if (existingActiveSpvOther && existingActiveSpvOther.spvUserId !== spvUserId) {
    return { success: false, error: 'REACTIVATE_DUPLICATE_ACTIVE_SPV', detail: 'Member sudah memiliki SPV aktif lain, tidak bisa reactivate membership lama' }
  }

  const actorForDb = params.actorUserId && Number.isFinite(params.actorUserId) && params.actorUserId > 0 ? Number(params.actorUserId) : null

  await runReviewDbExecute(
    `
      UPDATE ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      SET
        active = 1,
        reactivated_by_user_id = ?,
        reactivated_at = CURRENT_TIMESTAMP,
        deactivated_by_user_id = NULL,
        deactivated_at = NULL,
        deactivation_reason = NULL
      WHERE id = ?
        AND active = 0
    `,
    [actorForDb, historical.id],
  )

  invalidateReviewDbTableCache(SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME)
  return { success: true }
}

export async function ensureSalesTeamMembershipTable() {
  await runReviewDbExecute(
    `
      CREATE TABLE IF NOT EXISTS ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        spv_user_id BIGINT UNSIGNED NOT NULL,
        member_user_id BIGINT UNSIGNED NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        active_member_unique BIGINT UNSIGNED GENERATED ALWAYS AS (IF(active = 1, member_user_id, NULL)) VIRTUAL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by_user_id BIGINT UNSIGNED NULL,
        deactivated_by_user_id BIGINT UNSIGNED NULL,
        deactivated_at DATETIME NULL,
        deactivation_reason VARCHAR(500) NULL,
        reactivated_by_user_id BIGINT UNSIGNED NULL,
        reactivated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_stm_active_member_unique (active_member_unique),
        KEY idx_stm_spv (spv_user_id),
        KEY idx_stm_member (member_user_id),
        KEY idx_stm_active_spv (spv_user_id, active),
        KEY idx_stm_active_member_pair (member_user_id, active),
        CONSTRAINT chk_stm_self_assign CHECK (spv_user_id <> member_user_id),
        CONSTRAINT fk_stm_spv_user FOREIGN KEY (spv_user_id) REFERENCES auth_users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_stm_member_user FOREIGN KEY (member_user_id) REFERENCES auth_users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_stm_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
        CONSTRAINT fk_stm_deactivated_by FOREIGN KEY (deactivated_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
        CONSTRAINT fk_stm_reactivated_by FOREIGN KEY (reactivated_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  )
  invalidateReviewDbColumnCache(SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME)
  invalidateReviewDbTableCache(SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME)
}

export function resolveManagedSalesUsersPure(params: {
  sessionRole: AppRole
  sessionUserId: number | undefined
  activeMembershipsForSpv: { memberUserId: number }[]
}): number[] {
  const userId = params.sessionUserId
  if (!userId || !Number.isFinite(userId)) return []

  const role = params.sessionRole

  if (role === 'PENJUALAN' || role === 'SALES_MARKETING') {
    return [userId]
  }

  if (role === 'SPV_SALES') {
    const result = new Set<number>()
    result.add(userId)
    for (const m of params.activeMembershipsForSpv) {
      const mid = Number(m.memberUserId)
      if (Number.isFinite(mid) && mid > 0) {
        result.add(mid)
      }
    }
    return Array.from(result).sort((a, b) => a - b)
  }

  return [userId]
}

export function resolveManagedOwnerAliasesPure(params: {
  sessionRole: AppRole
  sessionUserId: number | undefined
  activeMembershipsForSpv: { memberUserId: number }[]
}): number[] {
  return resolveManagedSalesUsersPure(params)
}

export async function resolveManagedSalesUsers(session: AppSession): Promise<number[]> {
  const userId = session.userId
  if (!userId || !Number.isFinite(userId)) return []

  const role = session.role

  if (role === 'PENJUALAN' || role === 'SALES_MARKETING') {
    return [userId]
  }

  if (role === 'SPV_SALES') {
    let activeMembers: { memberUserId: number }[] = []
    if (isReviewDbConfigured()) {
      try {
        activeMembers = await listActiveMembersForSpv(userId)
      } catch {
        activeMembers = []
      }
    }
    return resolveManagedSalesUsersPure({
      sessionRole: role,
      sessionUserId: userId,
      activeMembershipsForSpv: activeMembers,
    })
  }

  return [userId]
}

export async function listAllSalesTeamMemberships(): Promise<SalesTeamMembership[]> {
  if (!isReviewDbConfigured()) return []
  const rows = await runReviewDbQuery<SalesTeamMembership>(
    `
      SELECT
        id,
        spv_user_id AS spvUserId,
        member_user_id AS memberUserId,
        active,
        created_at AS createdAt,
        updated_at AS updatedAt,
        created_by_user_id AS createdByUserId,
        deactivated_by_user_id AS deactivatedByUserId,
        deactivated_at AS deactivatedAt,
        deactivation_reason AS deactivationReason,
        reactivated_by_user_id AS reactivatedByUserId,
        reactivated_at AS reactivatedAt
      FROM ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      ORDER BY id DESC
    `,
    [],
  )
  return rows
}

export type HardDeleteMembershipParams = {
  spvUserId: number
  memberUserId: number
}

export type HardDeleteMembershipResult =
  | { success: true; deleted: boolean }
  | { success: false; error: MembershipValidationError; detail?: string }

export async function hardDeleteSalesTeamMembership(
  params: HardDeleteMembershipParams,
): Promise<HardDeleteMembershipResult> {
  const spvUserId = Number(params.spvUserId)
  const memberUserId = Number(params.memberUserId)
  if (!Number.isFinite(spvUserId) || !Number.isFinite(memberUserId)) {
    return { success: false, error: 'MEMBERSHIP_NOT_FOUND', detail: 'User id tidak valid' }
  }

  const historical = await findHistoricalMembership(spvUserId, memberUserId)
  if (!historical) {
    return { success: false, error: 'MEMBERSHIP_NOT_FOUND', detail: 'Membership tidak ditemukan untuk pasangan ini' }
  }

  const execRes = await runReviewDbExecute<{ affectedRows: number }>(
    `
      DELETE FROM ${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}
      WHERE spv_user_id = ?
        AND member_user_id = ?
    `,
    [spvUserId, memberUserId],
  )

  invalidateReviewDbTableCache(SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME)
  const deleted = Number(execRes?.affectedRows ?? 0) > 0
  return { success: true, deleted }
}


export async function resolveManagedOwnerAliases(session: AppSession): Promise<number[]> {
  return resolveManagedSalesUsers(session)
}

export async function resolveManagedSalesUserIdsSpvOnly(spvUserId: number): Promise<number[]> {
  if (!Number.isFinite(spvUserId) || spvUserId <= 0) return []
  if (!isReviewDbConfigured()) return []
  try {
    const memberships = await listActiveMembersForSpv(spvUserId)
    return memberships.map((m) => Number(m.memberUserId)).filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

export const SALES_TEAM_MEMBERSHIP_PROVISION_META = {
  target: SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME,
  engine: 'InnoDB',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  expectedColumns: [
    'id',
    'spv_user_id',
    'member_user_id',
    'active',
    'active_member_unique',
    'created_at',
    'updated_at',
    'created_by_user_id',
    'deactivated_by_user_id',
    'deactivated_at',
    'deactivation_reason',
    'reactivated_by_user_id',
    'reactivated_at',
  ],
  expectedIndexes: [
    'PRIMARY',
    'uk_stm_active_member_unique',
    'idx_stm_spv',
    'idx_stm_member',
    'idx_stm_active_spv',
    'idx_stm_active_member_pair',
  ],
  expectedFk: [
    'fk_stm_spv_user',
    'fk_stm_member_user',
    'fk_stm_created_by',
    'fk_stm_deactivated_by',
    'fk_stm_reactivated_by',
  ],
  expectedCheckConstraints: ['chk_stm_self_assign'],
} as const
