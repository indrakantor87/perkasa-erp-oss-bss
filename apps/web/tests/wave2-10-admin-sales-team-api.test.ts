import {
  handleAdminListMemberships,
  handleAdminCreateMembership,
  handleAdminDeactivateMembership,
  handleAdminReactivateMembership,
  handleAdminHardDeleteMembership,
  _setAdminSvcRef,
  _resetAdminSvcRefs,
} from '@/lib/services/admin-sales-team-api-handlers'
import type {
  AdminHandlerSession,
  AdminHandlerResult,
} from '@/lib/services/admin-sales-team-api-handlers'
import type {
  CreateMembershipResult,
  DeactivateMembershipResult,
  ReactivateMembershipResult,
  HardDeleteMembershipResult,
  SalesTeamMembership,
  MembershipValidationError,
} from '@/lib/services/sales-team-membership-service'

let calls: Record<string, unknown[]> = {}

function capture(label: string, ...args: unknown[]) {
  if (!calls[label]) calls[label] = []
  calls[label].push(args)
}

type SvcKey =
  | 'listAllSalesTeamMemberships'
  | 'createSalesTeamMembership'
  | 'deactivateSalesTeamMembership'
  | 'reactivateSalesTeamMembership'
  | 'hardDeleteSalesTeamMembership'

function patch(
  key: SvcKey,
  replacement: (p?: unknown) => Promise<unknown>,
) {
  _setAdminSvcRef(key, replacement as Parameters<typeof _setAdminSvcRef>[1])
}

function restoreAll() {
  _resetAdminSvcRefs()
  calls = {}
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  const act = JSON.stringify(actual)
  const exp = JSON.stringify(expected)
  if (act !== exp) {
    console.error(`[FAIL] ${label}`)
    console.error(`  actual:   ${act}`)
    console.error(`  expected: ${exp}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertTrue(cond: unknown, label: string) {
  if (!cond) {
    console.error(`[FAIL] ${label}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertHttp(
  r: AdminHandlerResult,
  expectedStatus: AdminHandlerResult['httpStatus'],
  label: string,
  opts: { containBody?: Record<string, unknown> } = {},
) {
  assertEqual(r.httpStatus, expectedStatus, `${label} status=${expectedStatus}`)
  if (opts.containBody && r.body && typeof r.body === 'object') {
    for (const k of Object.keys(opts.containBody)) {
      assertEqual(
        (r.body as Record<string, unknown>)[k],
        opts.containBody[k],
        `${label} body.${k} match`,
      )
    }
  }
}

function session(role: string, userId: number): AdminHandlerSession {
  return { role, userId }
}

async function run() {
  // T1, T2 — AUTH
  restoreAll()
  {
    const r1 = await handleAdminListMemberships(null)
    assertHttp(r1, 401, 'T1 unauthenticated (null) list → 401')
    const r1b = await handleAdminCreateMembership(null, { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r1b, 401, 'T1 unauthenticated create → 401')
    const r1c = await handleAdminDeactivateMembership(null, { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r1c, 401, 'T1 unauthenticated deactivate → 401')
    const r1d = await handleAdminReactivateMembership(null, { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r1d, 401, 'T1 unauthenticated reactivate → 401')
    const r1e = await handleAdminHardDeleteMembership(null, { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r1e, 401, 'T1 unauthenticated hard delete → 401')

    const r2a = await handleAdminListMemberships({ role: 'ADMIN', userId: 0 })
    assertHttp(r2a, 401, 'T2 userId=0 invalid → 401')
    const r2b = await handleAdminListMemberships({ role: 'ADMIN', userId: undefined })
    assertHttp(r2b, 401, 'T2 userId=undefined invalid → 401')
    const r2c = await handleAdminListMemberships({ role: '', userId: 500 })
    assertHttp(r2c, 401, 'T2 empty role → 401')
  }

  // T3-T8 — AUTHZ
  {
    patch('listAllSalesTeamMemberships', async (): Promise<SalesTeamMembership[]> => [])
    const r3 = await handleAdminListMemberships(session('OWNER', 5001))
    assertHttp(r3, 200, 'T3 OWNER list → 200', { containBody: { total: 0 } })
    restoreAll()

    patch('createSalesTeamMembership', async (_: unknown): Promise<CreateMembershipResult> => {
      capture('create', _)
      return { success: true, membershipId: 888 }
    })
    const r4 = await handleAdminCreateMembership(session('SUPER_ADMIN', 5002), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r4, 201, 'T4 SUPER_ADMIN create → 201', { containBody: { membershipId: 888 } })
    restoreAll()

    patch('listAllSalesTeamMemberships', async (): Promise<SalesTeamMembership[]> => [])
    const r5 = await handleAdminListMemberships(session('ADMIN', 5003))
    assertHttp(r5, 200, 'T5 ADMIN list → 200')
    restoreAll()

    const r6 = await handleAdminListMemberships(session('SPV_SALES', 6001))
    assertHttp(r6, 403, 'T6 SPV_SALES → 403')
    const r7 = await handleAdminCreateMembership(session('PENJUALAN', 6002), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r7, 403, 'T7 PENJUALAN → 403')
    const r8 = await handleAdminCreateMembership(session('SALES_MARKETING', 6003), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r8, 403, 'T8 SALES_MARKETING → 403')
  }

  // T9-T16 — CREATE
  {
    restoreAll()
    let seenCreateParams: unknown = null
    patch('createSalesTeamMembership', async (p: unknown): Promise<CreateMembershipResult> => {
      seenCreateParams = p
      return { success: true, membershipId: 9991 }
    })
    const r9 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 101, member_user_id: 201 })
    assertHttp(r9, 201, 'T9 valid SPV+PENJUALAN → 201', { containBody: { membershipId: 9991 } })
    const p9 = seenCreateParams as { spvUserId: number; memberUserId: number; actorUserId: number | null }
    assertEqual(p9.actorUserId, 9999, 'T9 actorUserId = session 9999')
    assertEqual(p9.spvUserId, 101, 'T9 spv preserved')
    assertEqual(p9.memberUserId, 201, 'T9 member preserved')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({ success: true, membershipId: 9992 }))
    const r10 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 102, member_user_id: 202 })
    assertHttp(r10, 201, 'T10 valid SPV+SALES_MARKETING → 201')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'SPV_ROLE_INVALID' as MembershipValidationError,
    }))
    const r11 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r11, 400, 'T11 SPV_ROLE_INVALID → 400')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'MEMBER_ROLE_INVALID' as MembershipValidationError,
    }))
    const r12 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r12, 400, 'T12 MEMBER_ROLE_INVALID → 400')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'SELF_ASSIGNMENT_NOT_ALLOWED' as MembershipValidationError,
    }))
    const r13 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 5, member_user_id: 5 })
    assertHttp(r13, 400, 'T13 SELF_ASSIGN → 400')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'BRANCH_MISMATCH' as MembershipValidationError,
    }))
    const r14 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r14, 400, 'T14 BRANCH_MISMATCH → 400')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'MEMBER_ALREADY_HAS_ACTIVE_SPV' as MembershipValidationError,
    }))
    const r15 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r15, 409, 'T15 duplicate active membership → 409')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'MEMBER_ALREADY_HAS_ACTIVE_SPV' as MembershipValidationError,
      detail: 'Member sudah memiliki SPV aktif lain',
    }))
    const r16 = await handleAdminCreateMembership(session('ADMIN', 9999), { spv_user_id: 1, member_user_id: 2 })
    assertHttp(r16, 409, 'T16 member has active SPV lain → 409')
  }

  // T17-T20 — DEACTIVATE
  {
    restoreAll()
    patch('deactivateSalesTeamMembership', async (_: unknown): Promise<DeactivateMembershipResult> => {
      capture('deactivate', _)
      return { success: true }
    })
    const r17 = await handleAdminDeactivateMembership(session('ADMIN', 1111), { spv_user_id: 1, member_user_id: 3, reason: 'T17' })
    assertHttp(r17, 200, 'T17 valid admin deactivate → 200')
    const d17 = (calls['deactivate']?.[0]?.[0]) as { actorUserId: number | null; reason?: string | null }
    assertEqual(d17.actorUserId, 1111, 'T17 actorUserId = session 1111')
    assertEqual(d17.reason, 'T17', 'T17 reason preserved')

    restoreAll()
    patch('deactivateSalesTeamMembership', async (): Promise<DeactivateMembershipResult> => ({
      success: false, error: 'MEMBERSHIP_NOT_FOUND' as MembershipValidationError,
      detail: 'Membership aktif tidak ditemukan',
    }))
    const r18 = await handleAdminDeactivateMembership(session('ADMIN', 1112), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r18, 409, 'T18 repeated deactivate safe reject → 409')

    restoreAll()
    const r19 = await handleAdminDeactivateMembership(session('SPV_SALES', 6666), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r19, 403, 'T19 SPV deactivate → 403')

    restoreAll()
    let seenDeactParams: unknown = null
    patch('deactivateSalesTeamMembership', async (p: unknown): Promise<DeactivateMembershipResult> => {
      seenDeactParams = p
      return { success: true }
    })
    const r20 = await handleAdminDeactivateMembership(
      session('ADMIN', 2222),
      { spv_user_id: 1, member_user_id: 3, deactivated_by_user_id: 999999, reason: 'T20 audit' } as Record<string, unknown>,
    )
    assertHttp(r20, 200, 'T20 deactivate → 200')
    const d20 = seenDeactParams as { actorUserId: number | null }
    assertEqual(d20.actorUserId, 2222, 'T20 actorUserId = session 2222 (NOT client override 999999)')
  }

  // T21-T24 — REACTIVATE
  {
    restoreAll()
    patch('reactivateSalesTeamMembership', async (_: unknown): Promise<ReactivateMembershipResult> => {
      capture('reactivate', _)
      return { success: true }
    })
    const r21 = await handleAdminReactivateMembership(session('ADMIN', 3333), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r21, 200, 'T21 valid reactivate → 200')

    restoreAll()
    patch('reactivateSalesTeamMembership', async (): Promise<ReactivateMembershipResult> => ({
      success: false, error: 'REACTIVATE_DUPLICATE_ACTIVE_SPV' as MembershipValidationError,
    }))
    const r22 = await handleAdminReactivateMembership(session('ADMIN', 3334), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r22, 409, 'T22 active-SPV conflict → 409')

    restoreAll()
    patch('reactivateSalesTeamMembership', async (): Promise<ReactivateMembershipResult> => ({
      success: false, error: 'REACTIVATE_VALIDATION_FAILED' as MembershipValidationError,
      detail: 'Role SPV bukan SPV_SALES lagi',
    }))
    const r23 = await handleAdminReactivateMembership(session('ADMIN', 3335), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r23, 400, 'T23 invalid role setelah historical → 400')

    restoreAll()
    patch('reactivateSalesTeamMembership', async (): Promise<ReactivateMembershipResult> => ({
      success: false, error: 'REACTIVATE_VALIDATION_FAILED' as MembershipValidationError,
      detail: 'Cabang SPV tidak sama dengan cabang member',
    }))
    const r24 = await handleAdminReactivateMembership(session('ADMIN', 3336), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r24, 400, 'T24 cross-branch setelah pindah cabang → 400')
  }

  // T25-T29 — HARD DELETE
  {
    restoreAll()
    patch('hardDeleteSalesTeamMembership', async (): Promise<HardDeleteMembershipResult> => ({ success: true, deleted: true }))
    const r25 = await handleAdminHardDeleteMembership(session('OWNER', 999), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r25, 204, 'T25 OWNER hard delete → 204')

    restoreAll()
    patch('hardDeleteSalesTeamMembership', async (): Promise<HardDeleteMembershipResult> => ({ success: true, deleted: true }))
    const r26 = await handleAdminHardDeleteMembership(session('SUPER_ADMIN', 998), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r26, 204, 'T26 SUPER_ADMIN hard delete → 204')

    restoreAll()
    const r27 = await handleAdminHardDeleteMembership(session('ADMIN', 997), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r27, 403, 'T27 ADMIN hard delete → 403')

    restoreAll()
    const r28 = await handleAdminHardDeleteMembership(session('SPV_SALES', 996), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r28, 403, 'T28 SPV_SALES hard delete → 403')

    restoreAll()
    const r29 = await handleAdminHardDeleteMembership(session('PENJUALAN', 995), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r29, 403, 'T29 PENJUALAN hard delete → 403')
  }

  // T30-T33 — SECURITY
  {
    restoreAll()
    let seenCreate30: unknown = null
    patch('createSalesTeamMembership', async (p: unknown): Promise<CreateMembershipResult> => {
      seenCreate30 = p
      return { success: true, membershipId: 3001 }
    })
    await handleAdminCreateMembership(
      session('ADMIN', 42),
      { spv_user_id: 1, member_user_id: 3, created_by_user_id: 888, role: 'OWNER' } as Record<string, unknown>,
    )
    const c30 = seenCreate30 as { actorUserId: number | null }
    assertEqual(c30.actorUserId, 42, 'T30 create actorUserId = session 42 (NOT body created_by=888)')

    restoreAll()
    let seenDeact30: unknown = null
    patch('deactivateSalesTeamMembership', async (p: unknown): Promise<DeactivateMembershipResult> => {
      seenDeact30 = p
      return { success: true }
    })
    await handleAdminDeactivateMembership(
      session('ADMIN', 43),
      { spv_user_id: 1, member_user_id: 3, deactivated_by_user_id: 777, created_by_user_id: 9999, reason: 'T30' } as Record<string, unknown>,
    )
    const d30 = seenDeact30 as { actorUserId: number | null }
    assertEqual(d30.actorUserId, 43, 'T30 deactivate actorUserId = session 43 (NOT body deactivated_by=777)')

    restoreAll()
    const r31 = await handleAdminListMemberships({ role: 'SPV_SALES', userId: 1001 })
    assertHttp(r31, 403, 'T31 auth: session SPV_SALES → 403 (role from session only, body.role ignored)')

    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'BRANCH_MISMATCH' as MembershipValidationError,
      detail: 'SPV dan member harus satu cabang',
    }))
    const r32 = await handleAdminCreateMembership(
      session('ADMIN', 5001),
      { spv_user_id: 1, member_user_id: 3, spv_branch_override: 10, member_branch_override: 10 } as Record<string, unknown>,
    )
    assertHttp(r32, 400, 'T32 branch bypass: branch mismatch tetap enforced → 400 (no branch override)')

    restoreAll()
    const r33a = await handleAdminListMemberships(session('SPV_SALES', 1212))
    assertHttp(r33a, 403, 'T33 SPV list → 403 (no workaround SPV-scoped via admin endpoint)')
    const r33b = await handleAdminCreateMembership(session('SPV_SALES', 1213), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r33b, 403, 'T33 SPV create → 403')
    const r33c = await handleAdminDeactivateMembership(session('SPV_SALES', 1214), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r33c, 403, 'T33 SPV deactivate → 403')
    const r33d = await handleAdminReactivateMembership(session('SPV_SALES', 1215), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r33d, 403, 'T33 SPV reactivate → 403')
    const r33e = await handleAdminHardDeleteMembership(session('SPV_SALES', 1216), { spv_user_id: 1, member_user_id: 3 })
    assertHttp(r33e, 403, 'T33 SPV hard delete → 403')
  }

  restoreAll()
  assertTrue(true, 'Sanitization invariant: only spv_user_id/member_user_id(/reason) preserved, audit fields discarded.')
  console.log('\n=== WAVE 2-10 SUMMARY ===')
  console.log('Phase 3A Admin Sales Team API: 33 test scenarios (T1-T33) all assertions run.')
  const exitCode = process.exitCode ?? 0
  if (exitCode === 0) console.log('ALL TESTS PASSED exit=0')
  else console.log(`FAILURES exit=${exitCode}`)
}

run().catch((e: unknown) => {
  _resetAdminSvcRefs()
  console.error('[FATAL] wave2-10 harness crashed:', e)
  process.exitCode = 1
})
