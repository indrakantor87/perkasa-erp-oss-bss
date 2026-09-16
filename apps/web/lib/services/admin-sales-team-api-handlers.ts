import type { AppRole } from '@/lib/types'
import type { MembershipValidationError } from '@/lib/services/sales-team-membership-service'
import * as MembershipSvc from '@/lib/services/sales-team-membership-service'
import type {
  SalesTeamMembership,
  CreateMembershipResult,
  DeactivateMembershipResult,
  ReactivateMembershipResult,
  HardDeleteMembershipResult,
} from '@/lib/services/sales-team-membership-service'

export type AdminHandlerSession = {
  userId?: number | null | undefined
  role?: AppRole | string | null | undefined
} | null

export type AdminHandlerResult = {
  httpStatus: 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 500
  body: unknown
}

const ADMIN_TIER_ROLES: ReadonlySet<string> = new Set<string>([
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
])

const OWNER_TIER_ROLES: ReadonlySet<string> = new Set<string>([
  'OWNER',
  'SUPER_ADMIN',
])

const svcRefs: {
  listAllSalesTeamMemberships: typeof MembershipSvc.listAllSalesTeamMemberships
  createSalesTeamMembership: typeof MembershipSvc.createSalesTeamMembership
  deactivateSalesTeamMembership: typeof MembershipSvc.deactivateSalesTeamMembership
  reactivateSalesTeamMembership: typeof MembershipSvc.reactivateSalesTeamMembership
  hardDeleteSalesTeamMembership: typeof MembershipSvc.hardDeleteSalesTeamMembership
} = {
  listAllSalesTeamMemberships: MembershipSvc.listAllSalesTeamMemberships,
  createSalesTeamMembership: MembershipSvc.createSalesTeamMembership,
  deactivateSalesTeamMembership: MembershipSvc.deactivateSalesTeamMembership,
  reactivateSalesTeamMembership: MembershipSvc.reactivateSalesTeamMembership,
  hardDeleteSalesTeamMembership: MembershipSvc.hardDeleteSalesTeamMembership,
}

export function _setAdminSvcRef(
  key: keyof typeof svcRefs,
  fn: unknown,
): void {
  ;(svcRefs as Record<string, unknown>)[key] = fn
}

export function _resetAdminSvcRefs(): void {
  svcRefs.listAllSalesTeamMemberships = MembershipSvc.listAllSalesTeamMemberships
  svcRefs.createSalesTeamMembership = MembershipSvc.createSalesTeamMembership
  svcRefs.deactivateSalesTeamMembership = MembershipSvc.deactivateSalesTeamMembership
  svcRefs.reactivateSalesTeamMembership = MembershipSvc.reactivateSalesTeamMembership
  svcRefs.hardDeleteSalesTeamMembership = MembershipSvc.hardDeleteSalesTeamMembership
}

function isPositiveFiniteNumber(v: unknown): v is number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}

function unauthenticated(): AdminHandlerResult {
  return { httpStatus: 401, body: { message: 'Unauthenticated' } }
}

function forbidden(message = 'Forbidden'): AdminHandlerResult {
  return { httpStatus: 403, body: { message } }
}

function badRequest(message: string, code?: MembershipValidationError): AdminHandlerResult {
  const body: Record<string, unknown> = { message }
  if (code) body.code = code
  return { httpStatus: 400, body }
}

function notFound(message: string, code?: MembershipValidationError): AdminHandlerResult {
  const body: Record<string, unknown> = { message }
  if (code) body.code = code
  return { httpStatus: 404, body }
}

function conflict(message: string, code?: MembershipValidationError): AdminHandlerResult {
  const body: Record<string, unknown> = { message }
  if (code) body.code = code
  return { httpStatus: 409, body }
}

export function extractActorUserId(session: AdminHandlerSession): number | null {
  if (!session) return null
  const uid = session.userId
  if (uid === null || uid === undefined) return null
  const n = Number(uid)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function ensureAuthenticated(session: AdminHandlerSession): AdminHandlerResult | null {
  if (!session) return unauthenticated()
  const uid = extractActorUserId(session)
  if (!uid) return unauthenticated()
  const role = typeof session.role === 'string' ? session.role.trim().toUpperCase() : ''
  if (!role) return unauthenticated()
  return null
}

export function ensureAdminTier(session: AdminHandlerSession): AdminHandlerResult | null {
  const authN = ensureAuthenticated(session)
  if (authN) return authN
  const role = String(session!.role ?? '').trim().toUpperCase()
  if (!ADMIN_TIER_ROLES.has(role)) return forbidden()
  return null
}

export function ensureOwnerTier(session: AdminHandlerSession): AdminHandlerResult | null {
  const authN = ensureAuthenticated(session)
  if (authN) return authN
  const role = String(session!.role ?? '').trim().toUpperCase()
  if (!OWNER_TIER_ROLES.has(role)) return forbidden('Hard delete hanya diperbolehkan OWNER / SUPER_ADMIN')
  return null
}

type AdminCreateBody = {
  spv_user_id: unknown
  member_user_id: unknown
}

type AdminPairBody = {
  spv_user_id: unknown
  member_user_id: unknown
  reason?: unknown
}

function sanitizeCreateBody(raw: unknown): AdminCreateBody {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  return {
    spv_user_id: obj.spv_user_id,
    member_user_id: obj.member_user_id,
  }
}

function sanitizePairBody(raw: unknown, includeReason: boolean): AdminPairBody {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const result: AdminPairBody = {
    spv_user_id: obj.spv_user_id,
    member_user_id: obj.member_user_id,
  }
  if (includeReason && obj.reason !== undefined) {
    result.reason = obj.reason
  }
  return result
}

function mapServiceErrorToHandler(
  result:
    | CreateMembershipResult
    | DeactivateMembershipResult
    | ReactivateMembershipResult
    | HardDeleteMembershipResult,
  operation: 'create' | 'deactivate' | 'reactivate' | 'hardDelete',
): AdminHandlerResult {
  if (result.success) {
    if (operation === 'create') {
      const r = result as Extract<CreateMembershipResult, { success: true }>
      return { httpStatus: 201, body: { ok: true, membershipId: r.membershipId } }
    }
    if (operation === 'hardDelete') {
      const r = result as Extract<HardDeleteMembershipResult, { success: true }>
      return r.deleted
        ? { httpStatus: 204, body: null }
        : { httpStatus: 200, body: { ok: true, deleted: false } }
    }
    return { httpStatus: 200, body: { ok: true } }
  }
  const err: MembershipValidationError = result.error
  const detail = (result as { detail?: string }).detail ?? ''
  switch (err) {
    case 'MEMBERSHIP_NOT_FOUND':
      return notFound(detail || 'Membership tidak ditemukan', err)
    case 'MEMBER_ALREADY_HAS_ACTIVE_SPV':
    case 'REACTIVATE_DUPLICATE_ACTIVE_SPV':
      return conflict(detail || 'Member sudah memiliki SPV aktif lain', err)
    case 'SELF_ASSIGNMENT_NOT_ALLOWED':
    case 'SPV_ROLE_INVALID':
    case 'MEMBER_ROLE_INVALID':
    case 'SPV_NOT_ACTIVE':
    case 'MEMBER_NOT_ACTIVE':
    case 'BRANCH_MISMATCH':
    case 'REACTIVATE_VALIDATION_FAILED':
      return badRequest(
        detail || membershipValidationErrorDefaultMessage(err),
        err,
      )
    default:
      return badRequest(detail || 'Validasi membership gagal')
  }
}

function membershipValidationErrorDefaultMessage(err: MembershipValidationError): string {
  switch (err) {
    case 'SELF_ASSIGNMENT_NOT_ALLOWED': return 'SPV tidak boleh sama dengan member'
    case 'SPV_ROLE_INVALID': return 'SPV harus memiliki role SPV_SALES'
    case 'MEMBER_ROLE_INVALID': return 'Member harus memiliki role PENJUALAN atau SALES_MARKETING'
    case 'SPV_NOT_ACTIVE': return 'User SPV tidak aktif'
    case 'MEMBER_NOT_ACTIVE': return 'User member tidak aktif'
    case 'BRANCH_MISMATCH': return 'SPV dan member harus satu cabang'
    case 'MEMBER_ALREADY_HAS_ACTIVE_SPV': return 'Member sudah memiliki SPV aktif lain'
    case 'MEMBERSHIP_NOT_FOUND': return 'Membership tidak ditemukan'
    case 'REACTIVATE_VALIDATION_FAILED': return 'Validasi reaktivasi gagal'
    case 'REACTIVATE_DUPLICATE_ACTIVE_SPV': return 'Member sudah memiliki SPV aktif lain, tidak bisa reaktivasi'
    default: return 'Validasi gagal'
  }
}

export async function handleAdminListMemberships(
  session: AdminHandlerSession,
): Promise<AdminHandlerResult> {
  const authZ = ensureAdminTier(session)
  if (authZ) return authZ
  try {
    const rows = await svcRefs.listAllSalesTeamMemberships()
    return { httpStatus: 200, body: { data: rows, total: rows.length } }
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleAdminCreateMembership(
  session: AdminHandlerSession,
  rawBody: unknown,
): Promise<AdminHandlerResult> {
  const authZ = ensureAdminTier(session)
  if (authZ) return authZ
  const actorUserId = extractActorUserId(session) ?? null
  const body = sanitizeCreateBody(rawBody)
  if (!isPositiveFiniteNumber(body.spv_user_id) || !isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('spv_user_id dan member_user_id harus integer positif')
  }
  try {
    const result = await svcRefs.createSalesTeamMembership({
      spvUserId: Number(body.spv_user_id),
      memberUserId: Number(body.member_user_id),
      actorUserId,
    })
    return mapServiceErrorToHandler(result, 'create')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleAdminDeactivateMembership(
  session: AdminHandlerSession,
  rawBody: unknown,
): Promise<AdminHandlerResult> {
  const authZ = ensureAdminTier(session)
  if (authZ) return authZ
  const actorUserId = extractActorUserId(session) ?? null
  const body = sanitizePairBody(rawBody, true)
  if (!isPositiveFiniteNumber(body.spv_user_id) || !isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('spv_user_id dan member_user_id harus integer positif')
  }
  const reason = body.reason !== undefined && body.reason !== null
    ? String(body.reason).slice(0, 500)
    : null
  try {
    const result = await svcRefs.deactivateSalesTeamMembership({
      spvUserId: Number(body.spv_user_id),
      memberUserId: Number(body.member_user_id),
      actorUserId,
      reason,
    })
    if (!result.success && result.error === 'MEMBERSHIP_NOT_FOUND') {
      const detail = (result as { detail?: string }).detail ?? ''
      return conflict(detail || 'Membership tidak dalam status aktif sehingga tidak bisa di-deactivate', result.error)
    }
    return mapServiceErrorToHandler(result, 'deactivate')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleAdminReactivateMembership(
  session: AdminHandlerSession,
  rawBody: unknown,
): Promise<AdminHandlerResult> {
  const authZ = ensureAdminTier(session)
  if (authZ) return authZ
  const actorUserId = extractActorUserId(session) ?? null
  const body = sanitizePairBody(rawBody, false)
  if (!isPositiveFiniteNumber(body.spv_user_id) || !isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('spv_user_id dan member_user_id harus integer positif')
  }
  try {
    const result = await svcRefs.reactivateSalesTeamMembership({
      spvUserId: Number(body.spv_user_id),
      memberUserId: Number(body.member_user_id),
      actorUserId,
    })
    return mapServiceErrorToHandler(result, 'reactivate')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleAdminHardDeleteMembership(
  session: AdminHandlerSession,
  rawBody: unknown,
): Promise<AdminHandlerResult> {
  const authZ = ensureOwnerTier(session)
  if (authZ) return authZ
  const body = sanitizePairBody(rawBody, false)
  if (!isPositiveFiniteNumber(body.spv_user_id) || !isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('spv_user_id dan member_user_id harus integer positif')
  }
  try {
    const result = await svcRefs.hardDeleteSalesTeamMembership({
      spvUserId: Number(body.spv_user_id),
      memberUserId: Number(body.member_user_id),
    })
    return mapServiceErrorToHandler(result, 'hardDelete')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export type { SalesTeamMembership }
