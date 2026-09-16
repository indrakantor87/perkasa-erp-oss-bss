import type { AppRole } from '@/lib/types'
import type { MembershipValidationError } from '@/lib/services/sales-team-membership-service'
import * as MembershipSvc from '@/lib/services/sales-team-membership-service'
import type {
  SalesTeamMembership,
  CreateMembershipResult,
  DeactivateMembershipResult,
  ReactivateMembershipResult,
} from '@/lib/services/sales-team-membership-service'

export type SpvHandlerSession = {
  userId?: number | null | undefined
  role?: AppRole | string | null | undefined
} | null

export type SpvHandlerResult = {
  httpStatus: 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 500
  body: unknown
}

const SPV_ONLY_ROLE: string = 'SPV_SALES'

const svcRefs: {
  listScopedSpvMemberships: typeof MembershipSvc.listScopedSpvMemberships
  createSalesTeamMembership: typeof MembershipSvc.createSalesTeamMembership
  deactivateSalesTeamMembership: typeof MembershipSvc.deactivateSalesTeamMembership
  reactivateSalesTeamMembership: typeof MembershipSvc.reactivateSalesTeamMembership
} = {
  listScopedSpvMemberships: MembershipSvc.listScopedSpvMemberships,
  createSalesTeamMembership: MembershipSvc.createSalesTeamMembership,
  deactivateSalesTeamMembership: MembershipSvc.deactivateSalesTeamMembership,
  reactivateSalesTeamMembership: MembershipSvc.reactivateSalesTeamMembership,
}

export function _setSpvSvcRef(key: keyof typeof svcRefs, fn: unknown): void {
  ;(svcRefs as Record<string, unknown>)[key] = fn
}

export function _resetSpvSvcRefs(): void {
  svcRefs.listScopedSpvMemberships = MembershipSvc.listScopedSpvMemberships
  svcRefs.createSalesTeamMembership = MembershipSvc.createSalesTeamMembership
  svcRefs.deactivateSalesTeamMembership = MembershipSvc.deactivateSalesTeamMembership
  svcRefs.reactivateSalesTeamMembership = MembershipSvc.reactivateSalesTeamMembership
}

function isPositiveFiniteNumber(v: unknown): v is number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}

function unauthenticated(): SpvHandlerResult {
  return { httpStatus: 401, body: { message: 'Unauthenticated' } }
}

function forbidden(message = 'Forbidden'): SpvHandlerResult {
  return { httpStatus: 403, body: { message } }
}

function badRequest(message: string, code?: MembershipValidationError): SpvHandlerResult {
  const body: Record<string, unknown> = { message }
  if (code) body.code = code
  return { httpStatus: 400, body }
}

function notFound(message: string, code?: MembershipValidationError): SpvHandlerResult {
  const body: Record<string, unknown> = { message }
  if (code) body.code = code
  return { httpStatus: 404, body }
}

function conflict(message: string, code?: MembershipValidationError): SpvHandlerResult {
  const body: Record<string, unknown> = { message }
  if (code) body.code = code
  return { httpStatus: 409, body }
}

export function extractActorUserId(session: SpvHandlerSession): number | null {
  if (!session) return null
  const uid = session.userId
  if (uid === null || uid === undefined) return null
  const n = Number(uid)
  return Number.isFinite(n) && n > 0 ? n : null
}

function ensureAuthenticated(session: SpvHandlerSession): SpvHandlerResult | null {
  if (!session) return unauthenticated()
  const uid = extractActorUserId(session)
  if (!uid) return unauthenticated()
  const role = typeof session.role === 'string' ? session.role.trim().toUpperCase() : ''
  if (!role) return unauthenticated()
  return null
}

export function ensureSpvOnly(session: SpvHandlerSession): SpvHandlerResult | null {
  const authN = ensureAuthenticated(session)
  if (authN) return authN
  const role = String(session!.role ?? '').trim().toUpperCase()
  if (role !== SPV_ONLY_ROLE) return forbidden('Endpoint ini hanya untuk SPV_SALES')
  return null
}

type SpvCreateBody = { member_user_id: unknown }
type SpvPairBody = { member_user_id: unknown; reason?: unknown }

function sanitizeScopedCreateBody(raw: unknown): SpvCreateBody {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  return { member_user_id: obj.member_user_id }
}

function sanitizeScopedPairBody(raw: unknown, includeReason: boolean): SpvPairBody {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  const result: SpvPairBody = { member_user_id: obj.member_user_id }
  if (includeReason && obj.reason !== undefined) result.reason = obj.reason
  return result
}

function membershipErrDefault(err: MembershipValidationError): string {
  switch (err) {
    case 'SELF_ASSIGNMENT_NOT_ALLOWED': return 'SPV tidak boleh menjadi member sendiri'
    case 'SPV_ROLE_INVALID': return 'SPV harus SPV_SALES'
    case 'MEMBER_ROLE_INVALID': return 'Member harus PENJUALAN atau SALES_MARKETING'
    case 'SPV_NOT_ACTIVE': return 'SPV tidak aktif'
    case 'MEMBER_NOT_ACTIVE': return 'Member tidak aktif'
    case 'BRANCH_MISMATCH': return 'SPV dan member harus satu cabang'
    case 'MEMBER_ALREADY_HAS_ACTIVE_SPV': return 'Member sudah memiliki SPV aktif lain'
    case 'MEMBERSHIP_NOT_FOUND': return 'Membership tidak ditemukan dalam cakupan SPV ini'
    case 'REACTIVATE_VALIDATION_FAILED': return 'Validasi reaktivasi gagal'
    case 'REACTIVATE_DUPLICATE_ACTIVE_SPV': return 'Member sudah memiliki SPV aktif lain, tidak bisa reaktivasi'
    default: return 'Validasi gagal'
  }
}

type SpvOp = 'create' | 'deactivate' | 'reactivate'

function mapServiceError(
  result: CreateMembershipResult | DeactivateMembershipResult | ReactivateMembershipResult,
  op: SpvOp,
): SpvHandlerResult {
  if (result.success) {
    if (op === 'create') {
      const r = result as Extract<CreateMembershipResult, { success: true }>
      return { httpStatus: 201, body: { ok: true, membershipId: r.membershipId } }
    }
    if (op === 'deactivate') {
      return { httpStatus: 204, body: null }
    }
    return { httpStatus: 200, body: { ok: true } }
  }
  const err: MembershipValidationError = result.error
  const detail = (result as { detail?: string }).detail ?? ''
  switch (err) {
    case 'MEMBERSHIP_NOT_FOUND':
      return notFound(detail || membershipErrDefault(err), err)
    case 'MEMBER_ALREADY_HAS_ACTIVE_SPV':
    case 'REACTIVATE_DUPLICATE_ACTIVE_SPV':
      return conflict(detail || membershipErrDefault(err), err)
    case 'SELF_ASSIGNMENT_NOT_ALLOWED':
    case 'SPV_ROLE_INVALID':
    case 'MEMBER_ROLE_INVALID':
    case 'SPV_NOT_ACTIVE':
    case 'MEMBER_NOT_ACTIVE':
    case 'BRANCH_MISMATCH':
    case 'REACTIVATE_VALIDATION_FAILED':
      return badRequest(detail || membershipErrDefault(err), err)
    default:
      return badRequest(detail || 'Validasi membership gagal')
  }
}

export async function handleSpvListTeamMemberships(
  session: SpvHandlerSession,
): Promise<SpvHandlerResult> {
  const authZ = ensureSpvOnly(session)
  if (authZ) return authZ
  const spvUserId = extractActorUserId(session)!
  try {
    const rows = await svcRefs.listScopedSpvMemberships(spvUserId)
    return { httpStatus: 200, body: { data: rows, total: rows.length } }
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleSpvCreateMembership(
  session: SpvHandlerSession,
  rawBody: unknown,
): Promise<SpvHandlerResult> {
  const authZ = ensureSpvOnly(session)
  if (authZ) return authZ
  const spvUserId = extractActorUserId(session)!
  const actorUserId = spvUserId
  const body = sanitizeScopedCreateBody(rawBody)
  if (!isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('member_user_id harus integer positif')
  }
  try {
    const result = await svcRefs.createSalesTeamMembership({
      spvUserId,
      memberUserId: Number(body.member_user_id),
      actorUserId,
    })
    return mapServiceError(result, 'create')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleSpvDeactivateMembership(
  session: SpvHandlerSession,
  rawBody: unknown,
): Promise<SpvHandlerResult> {
  const authZ = ensureSpvOnly(session)
  if (authZ) return authZ
  const spvUserId = extractActorUserId(session)!
  const actorUserId = spvUserId
  const body = sanitizeScopedPairBody(rawBody, true)
  if (!isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('member_user_id harus integer positif')
  }
  const reason = body.reason !== undefined && body.reason !== null
    ? String(body.reason).slice(0, 500)
    : null
  try {
    const result = await svcRefs.deactivateSalesTeamMembership({
      spvUserId,
      memberUserId: Number(body.member_user_id),
      actorUserId,
      reason,
    })
    return mapServiceError(result, 'deactivate')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export async function handleSpvReactivateMembership(
  session: SpvHandlerSession,
  rawBody: unknown,
): Promise<SpvHandlerResult> {
  const authZ = ensureSpvOnly(session)
  if (authZ) return authZ
  const spvUserId = extractActorUserId(session)!
  const actorUserId = spvUserId
  const body = sanitizeScopedPairBody(rawBody, false)
  if (!isPositiveFiniteNumber(body.member_user_id)) {
    return badRequest('member_user_id harus integer positif')
  }
  try {
    const result = await svcRefs.reactivateSalesTeamMembership({
      spvUserId,
      memberUserId: Number(body.member_user_id),
      actorUserId,
    })
    return mapServiceError(result, 'reactivate')
  } catch {
    return { httpStatus: 500, body: { message: 'Internal error' } }
  }
}

export type { SalesTeamMembership }
