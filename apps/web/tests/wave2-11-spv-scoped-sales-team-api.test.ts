import {
  handleSpvListTeamMemberships,
  handleSpvCreateMembership,
  handleSpvDeactivateMembership,
  handleSpvReactivateMembership,
  _setSpvSvcRef,
  _resetSpvSvcRefs,
  ensureSpvOnly,
} from '@/lib/services/spv-sales-team-api-handlers'
import type {
  SpvHandlerSession,
  SpvHandlerResult,
} from '@/lib/services/spv-sales-team-api-handlers'
import { handleAdminHardDeleteMembership } from '@/lib/services/admin-sales-team-api-handlers'
import type {
  CreateMembershipResult,
  DeactivateMembershipResult,
  ReactivateMembershipResult,
  SalesTeamMembership,
  MembershipValidationError,
} from '@/lib/services/sales-team-membership-service'

let calls: Record<string, unknown[]> = {}

function capture(label: string, ...args: unknown[]) {
  if (!calls[label]) calls[label] = []
  calls[label].push(args)
}

type SvcKey =
  | 'listScopedSpvMemberships'
  | 'createSalesTeamMembership'
  | 'deactivateSalesTeamMembership'
  | 'reactivateSalesTeamMembership'

function patch(
  key: SvcKey,
  replacement: (p?: unknown) => Promise<unknown>,
) {
  _setSpvSvcRef(key, replacement)
}

function restoreAll() {
  _resetSpvSvcRefs()
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

function assertFalse(cond: unknown, label: string) {
  if (cond) {
    console.error(`[FAIL] ${label}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertHttp(
  r: SpvHandlerResult,
  expectedStatus: SpvHandlerResult['httpStatus'],
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

function session(role: string, userId: number): SpvHandlerSession {
  return { role, userId }
}

async function run() {
  // T1-T4 AUTHENTICATION
  restoreAll()
  {
    const r1 = await handleSpvListTeamMemberships(null)
    assertHttp(r1, 401, 'T1 unauthenticated GET list → 401')

    const r2 = await handleSpvCreateMembership(null, { member_user_id: 3 })
    assertHttp(r2, 401, 'T2 unauthenticated POST create → 401')

    const r3 = await handleSpvDeactivateMembership(null, { member_user_id: 3 })
    assertHttp(r3, 401, 'T3 unauthenticated deactivate → 401')

    const r4 = await handleSpvReactivateMembership(null, { member_user_id: 3 })
    assertHttp(r4, 401, 'T4 unauthenticated reactivate → 401')
  }

  // T5-T8 AUTHORIZATION (SPV_SALES allowed)
  {
    patch('listScopedSpvMemberships', async (): Promise<SalesTeamMembership[]> => [])
    const r5 = await handleSpvListTeamMemberships(session('SPV_SALES', 101))
    assertHttp(r5, 200, 'T5 SPV_SALES GET list → 200 allowed', { containBody: { total: 0 } })
    restoreAll()

    patch('createSalesTeamMembership', async (p: unknown): Promise<CreateMembershipResult> => {
      capture('create', p)
      return { success: true, membershipId: 7777 }
    })
    const r6 = await handleSpvCreateMembership(session('SPV_SALES', 101), { member_user_id: 201 })
    assertHttp(r6, 201, 'T6 SPV_SALES POST create → 201 allowed', { containBody: { membershipId: 7777 } })
    restoreAll()

    patch('deactivateSalesTeamMembership', async (): Promise<DeactivateMembershipResult> => ({ success: true }))
    const r7 = await handleSpvDeactivateMembership(session('SPV_SALES', 101), { member_user_id: 201, reason: 'T7' })
    assertHttp(r7, 204, 'T7 SPV_SALES deactivate → 204 allowed')
    restoreAll()

    patch('reactivateSalesTeamMembership', async (): Promise<ReactivateMembershipResult> => ({ success: true }))
    const r8 = await handleSpvReactivateMembership(session('SPV_SALES', 101), { member_user_id: 201 })
    assertHttp(r8, 200, 'T8 SPV_SALES reactivate → 200 allowed')
    restoreAll()
  }

  // T9-T13 DENIED non-SPV roles
  {
    const ensureForbidden = async (role: string, label: string, testAll4 = true) => {
      const a = await handleSpvListTeamMemberships(session(role, 11))
      assertHttp(a, 403, `${label} list → 403`)
      if (testAll4) {
        const b = await handleSpvCreateMembership(session(role, 11), { member_user_id: 2 })
        assertHttp(b, 403, `${label} create → 403`)
        const c = await handleSpvDeactivateMembership(session(role, 11), { member_user_id: 2 })
        assertHttp(c, 403, `${label} deactivate → 403`)
        const d = await handleSpvReactivateMembership(session(role, 11), { member_user_id: 2 })
        assertHttp(d, 403, `${label} reactivate → 403`)
      }
    }
    await ensureForbidden('OWNER', 'T9 OWNER')
    await ensureForbidden('SUPER_ADMIN', 'T10 SUPER_ADMIN')
    await ensureForbidden('ADMIN', 'T11 ADMIN')
    await ensureForbidden('PENJUALAN', 'T12 PENJUALAN')
    await ensureForbidden('SALES_MARKETING', 'T13 SALES_MARKETING')
    // bonus: other non-SPV also 403
    await ensureForbidden('CS_OPERATOR', 'bonus CS_OP 403', false)
  }

  // T14-T17 OWNERSHIP / CLIENT INJECT IGNORE
  {
    // T14 client spv_user_id: SPV_LAIN ignored
    restoreAll()
    let seenCreateT14: unknown = null
    patch('createSalesTeamMembership', async (p: unknown): Promise<CreateMembershipResult> => {
      seenCreateT14 = p
      return { success: true, membershipId: 7001 }
    })
    await handleSpvCreateMembership(
      session('SPV_SALES', 101),
      { spv_user_id: 999, member_user_id: 201 } as Record<string, unknown>,
    )
    const c14 = seenCreateT14 as { spvUserId: number; memberUserId: number }
    assertEqual(c14.spvUserId, 101, 'T14 client spv_user_id=999 ignored → spvUserId=session 101')
    assertEqual(c14.memberUserId, 201, 'T14 member preserved')

    // T15 client actor_user_id / created_by ignored → actorUserId = session
    restoreAll()
    let seenCreateT15: unknown = null
    patch('createSalesTeamMembership', async (p: unknown): Promise<CreateMembershipResult> => {
      seenCreateT15 = p
      return { success: true, membershipId: 7002 }
    })
    await handleSpvCreateMembership(
      session('SPV_SALES', 101),
      { member_user_id: 201, actor_user_id: 888, created_by_user_id: 888 } as Record<string, unknown>,
    )
    const c15 = seenCreateT15 as { actorUserId: number | null }
    assertEqual(c15.actorUserId, 101, 'T15 actor_user_id client 888 ignored → actorUserId=session 101')

    // T16 client role override ignored. session.role SPV → handler use session.role. body.role=ADMIN tetap 200.
    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({ success: true, membershipId: 7003 }))
    const r16 = await handleSpvCreateMembership(
      { role: 'SPV_SALES', userId: 101 },
      { member_user_id: 201, role: 'ADMIN' } as Record<string, unknown>,
    )
    assertHttp(r16, 201, 'T16 body role=ADMIN tapi session SPV → authz pakai session → 201 (role from session only)')

    // T17 client branch_override ignored → service still returns BRANCH_MISMATCH 400
    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'BRANCH_MISMATCH' as MembershipValidationError,
      detail: 'SPV dan member harus satu cabang',
    }))
    const r17 = await handleSpvCreateMembership(
      session('SPV_SALES', 101),
      { member_user_id: 201, spv_branch_override: 10, member_branch_override: 10 } as Record<string, unknown>,
    )
    assertHttp(r17, 400, 'T17 branch override client tidak berlaku → BRANCH_MISMATCH 400 enforced')
  }

  // T18-T20 NO IDOR / CROSS-SPV ISOLATION
  {
    // T18: list returns only spv scope rows. mock listScopedSpvMemberships(SPV=101) returns [] for SPV 101; no SPV 202 rows leak.
    restoreAll()
    patch('listScopedSpvMemberships', async (spv: unknown): Promise<SalesTeamMembership[]> => {
      const id = Number(spv)
      if (id === 101) return []  // SPV 101 tidak punya
      // Jika SPV lain return seolah ada data (test handler tidak akan memanggil untuk SPV lain; tapi service mock filter sudah)
      return [{ id: 99, spvUserId: 202, memberUserId: 303, active: 1 } as SalesTeamMembership]
    })
    const r18 = await handleSpvListTeamMemberships(session('SPV_SALES', 101))
    assertHttp(r18, 200, 'T18 list returns scoped only SPV101 rows → total 0 (no SPV202 rows leaked)', { containBody: { total: 0 } })

    // T19: SPV101 deactivate member 303 → service MEMBERSHIP_NOT_FOUND (bukan pasangan aktif SPV101) → 404
    restoreAll()
    patch('deactivateSalesTeamMembership', async (): Promise<DeactivateMembershipResult> => ({
      success: false, error: 'MEMBERSHIP_NOT_FOUND' as MembershipValidationError,
      detail: 'Tidak ada pasangan aktif untuk SPV ini',
    }))
    const r19 = await handleSpvDeactivateMembership(session('SPV_SALES', 101), { member_user_id: 303 })
    assertHttp(r19, 404, 'T19 SPV tidak dapat deactivate member SPV lain (MEMBERSHIP_NOT_FOUND) → 404')

    // T20: SPV101 reactivate historical milik SPV202 → MEMBERSHIP_NOT_FOUND → 404
    restoreAll()
    patch('reactivateSalesTeamMembership', async (): Promise<ReactivateMembershipResult> => ({
      success: false, error: 'MEMBERSHIP_NOT_FOUND' as MembershipValidationError,
      detail: 'Tidak ada historical membership untuk pasangan ini',
    }))
    const r20 = await handleSpvReactivateMembership(session('SPV_SALES', 101), { member_user_id: 303 })
    assertHttp(r20, 404, 'T20 SPV tidak dapat reactivate historical SPV lain → 404')
  }

  // T21-T24 VALIDATION SERVICE DELEGATION
  {
    // T21 self assignment → SELF_ASSIGNMENT_NOT_ALLOWED → 400
    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'SELF_ASSIGNMENT_NOT_ALLOWED' as MembershipValidationError,
    }))
    const r21 = await handleSpvCreateMembership(session('SPV_SALES', 101), { member_user_id: 101 })
    assertHttp(r21, 400, 'T21 self assignment → 400 SELF_ASSIGNMENT_NOT_ALLOWED')

    // T22 duplicate active → MEMBER_ALREADY_HAS_ACTIVE_SPV → 409
    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'MEMBER_ALREADY_HAS_ACTIVE_SPV' as MembershipValidationError,
    }))
    const r22 = await handleSpvCreateMembership(session('SPV_SALES', 101), { member_user_id: 201 })
    assertHttp(r22, 409, 'T22 duplicate active membership → 409 conflict')

    // T23 same branch accepted → success 201
    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({ success: true, membershipId: 7023 }))
    const r23 = await handleSpvCreateMembership(session('SPV_SALES', 101), { member_user_id: 201 })
    assertHttp(r23, 201, 'T23 same branch accepted → 201 created', { containBody: { membershipId: 7023 } })

    // T24 branch mismatch → BRANCH_MISMATCH → 400
    restoreAll()
    patch('createSalesTeamMembership', async (): Promise<CreateMembershipResult> => ({
      success: false, error: 'BRANCH_MISMATCH' as MembershipValidationError,
    }))
    const r24 = await handleSpvCreateMembership(session('SPV_SALES', 101), { member_user_id: 201 })
    assertHttp(r24, 400, 'T24 branch mismatch → 400')
  }

  // T25, T26 AUDIT / OWNERSHIP FINAL INTEGRITY (for deactivate + reactivate)
  {
    // T25 actor comes from session (deactivate + reactivate capture)
    restoreAll()
    let seenDeact: unknown = null
    patch('deactivateSalesTeamMembership', async (p: unknown): Promise<DeactivateMembershipResult> => {
      seenDeact = p
      return { success: true }
    })
    await handleSpvDeactivateMembership(
      session('SPV_SALES', 101),
      { member_user_id: 201, deactivated_by_user_id: 9999, reason: 'T25' } as Record<string, unknown>,
    )
    const d25 = seenDeact as { actorUserId: number | null; spvUserId: number }
    assertEqual(d25.actorUserId, 101, 'T25 deactivate actorUserId = session 101')
    assertEqual(d25.spvUserId, 101, 'T25 deactivate spvUserId = session 101')

    let seenReact: unknown = null
    patch('reactivateSalesTeamMembership', async (p: unknown): Promise<ReactivateMembershipResult> => {
      seenReact = p
      return { success: true }
    })
    await handleSpvReactivateMembership(
      session('SPV_SALES', 101),
      { member_user_id: 201, reactivated_by_user_id: 9999 } as Record<string, unknown>,
    )
    const d25b = seenReact as { actorUserId: number | null; spvUserId: number }
    assertEqual(d25b.actorUserId, 101, 'T25 reactivate actorUserId = session 101')

    // T26 ownership comes from session (spvUserId always = session.userId on 4 ops)
    restoreAll()
    // LIST: listScopedSpvMemberships called with session.userId = 2020
    let listCalled: unknown = undefined
    patch('listScopedSpvMemberships', async (id: unknown): Promise<SalesTeamMembership[]> => {
      listCalled = id
      return []
    })
    await handleSpvListTeamMemberships(session('SPV_SALES', 2020))
    assertEqual(listCalled, 2020, 'T26 list scoped spvUserId = session 2020')

    // CREATE: spvUserId = session.userId 3030
    restoreAll()
    let createCalled: unknown = null
    patch('createSalesTeamMembership', async (p: unknown): Promise<CreateMembershipResult> => {
      createCalled = p
      return { success: true, membershipId: 1 }
    })
    await handleSpvCreateMembership(session('SPV_SALES', 3030), { member_user_id: 4040 })
    const c26 = createCalled as { spvUserId: number; memberUserId: number; actorUserId: number | null }
    assertEqual(c26.spvUserId, 3030, 'T26 create spvUserId = session 3030')
    assertEqual(c26.memberUserId, 4040, 'T26 create member = 4040')
    assertEqual(c26.actorUserId, 3030, 'T26 create actor = session 3030')
  }

  // T27 hard delete unavailable to SPV
  {
    // 1. Tidak ada DELETE route di /api/me/team/memberships (verified secara spec: tidak dibuat)
    // 2. SPV mencoba hard delete via admin Phase 3A handler → tetap 403 (authorization P3A)
    const r = await handleAdminHardDeleteMembership(session('SPV_SALES', 101), { spv_user_id: 101, member_user_id: 201 })
    assertHttp(r as SpvHandlerResult, 403, 'T27 SPV hard delete via admin endpoint tetap 403 — hard delete SPV scope tidak tersedia')

    // 3. ensureSpvOnly untuk SPV_SALES = null, untuk hardDelete path (jika ada) harus 403 forbidden untuk non SPV role atau SPV role.
    // Pastikan exported function tidak ada untuk hard-delete SPV scope.
    const handlerModule = await import('@/lib/services/spv-sales-team-api-handlers')
    assertFalse(
      typeof (handlerModule as unknown as Record<string, unknown>)['handleSpvHardDeleteMembership'] === 'function',
      'T27 handler module TIDAK export handleSpvHardDeleteMembership (hard delete unavailable SPV scope)',
    )
  }

  // Final security check: ensureSpvOnly SPV_SALES returns null
  const gate = ensureSpvOnly(session('SPV_SALES', 1234))
  assertEqual(gate, null, 'ensureSpvOnly gate SPV pass = null (no block)')
  const gate2 = ensureSpvOnly(session('ADMIN', 1234))
  assertHttp(gate2 as SpvHandlerResult, 403, 'ensureSpvOnly ADMIN gate = 403')

  restoreAll()
  console.log('\n=== WAVE 2-11 SUMMARY ===')
  console.log('Phase 3B SPV Scoped Sales Team API: T1–T27 + invariants assertions all run.')
  const exitCode = process.exitCode ?? 0
  if (exitCode === 0) console.log('ALL TESTS PASSED exit=0')
  else console.log(`FAILURES exit=${exitCode}`)
}

run().catch((e: unknown) => {
  _resetSpvSvcRefs()
  console.error('[FATAL] wave2-11 harness crashed:', e)
  process.exitCode = 1
})
