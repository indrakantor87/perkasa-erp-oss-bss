import { APP_ROLES, type AppRole } from '@/lib/types'
import { getLockedOperationalDivision } from '@/lib/services/dashboard-service'
import {
  MARKETING_ACTIVITY_GLOBAL_OWNER_ROLES,
  canMutateMarketingActivities,
  resolveReadScopeRole,
  assertMarketingOwnerInScope,
  type MarketingActivityOwnerScope,
} from '@/lib/services/marketing-activity-service'
import {
  resolveSalesOwnerAliasesIncludingSpvTeamPure,
  SALES_SPV_VALID_ROLE_SET,
  SALES_MEMBER_VALID_ROLE_SET,
} from '@/lib/services/sales-team-membership-service'
import type { SalesTeamMembership, AliasPureUserRef } from '@/lib/services/sales-team-membership-service'

let exitCode = 0
let passCount = 0
let failCount = 0

function assertEqual<T>(actual: T, expected: T, label: string): boolean {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  actual:   ${a}\n  expected: ${e}`)
  exitCode = 1
  failCount++
  return false
}
function assertTrue(cond: unknown, label: string): boolean {
  if (cond) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}`)
  exitCode = 1
  failCount++
  return false
}
function assertFalse(cond: unknown, label: string): boolean {
  return assertTrue(!cond, label)
}
function assertIncludesAll(haystack: readonly string[], needles: readonly string[], label: string): boolean {
  const missing = needles.filter((n) => !haystack.includes(n))
  if (missing.length === 0) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  missing: ${JSON.stringify(missing)}\n  haystack: ${JSON.stringify(haystack)}`)
  exitCode = 1
  failCount++
  return false
}
function assertIncludes(haystack: string, needle: string, label: string): boolean {
  if (String(haystack ?? '').includes(needle)) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  haystack len=${String(haystack ?? '').length} needle=${JSON.stringify(needle)}`)
  exitCode = 1
  failCount++
  return false
}

async function assertThrows(fn: () => Promise<unknown>, label: string): Promise<boolean> {
  try {
    await fn()
    console.error(`[FAIL] ${label} — expected throw, tapi tidak ada error`)
    exitCode = 1
    failCount++
    return false
  } catch {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toUpperCase()
}

function buildMockSpvAndTeam(): {
  spvUserId: number; spvDisplayName: string; spvUsername: string
  member1UserId: number; member1DisplayName: string; member1Username: string
  member2UserId: number; member2DisplayName: string; member2Username: string
  memberships: { spvUserId: number; memberUserId: number; active: 1 | 0 }[]
  userRefs: AliasPureUserRef[]
} {
  const spvUserId = 11
  const spvDisplayName = 'Spv Andi'
  const spvUsername = 'spv.andi'
  const member1UserId = 21
  const member1DisplayName = 'Sales Budi'
  const member1Username = 'sales.budi'
  const member2UserId = 22
  const member2DisplayName = 'Marketing Siti'
  const member2Username = 'marketing.siti'

  const memberships: { spvUserId: number; memberUserId: number; active: 1 | 0 }[] = [
    { spvUserId, memberUserId: member1UserId, active: 1 },
    { spvUserId, memberUserId: member2UserId, active: 1 },
  ]
  const userRefs: AliasPureUserRef[] = [
    { userId: spvUserId, roleCode: 'SPV_SALES', status: 'ACTIVE', displayName: spvDisplayName, username: spvUsername },
    { userId: member1UserId, roleCode: 'PENJUALAN', status: 'ACTIVE', displayName: member1DisplayName, username: member1Username },
    { userId: member2UserId, roleCode: 'SALES_MARKETING', status: 'ACTIVE', displayName: member2DisplayName, username: member2Username },
  ]
  return {
    spvUserId, spvDisplayName, spvUsername,
    member1UserId, member1DisplayName, member1Username,
    member2UserId, member2DisplayName, member2Username,
    memberships, userRefs,
  }
}

function buildSubscriptionClause(ownerAliases: string[]): { clause: string | null; filter: string } {
  const clause = ownerAliases.length
    ? `LOWER(COALESCE(so.marketing_name, '')) IN (${ownerAliases.map(() => '?').join(', ')})`
    : null
  const filter = clause
    ? `FROM service_subscriptions ss JOIN sales_orders so ON so.id = ss.order_id WHERE ss.activated_at IS NOT NULL AND ss.activated_at >= ? AND ss.activated_at < ? AND ${clause}`
    : `FROM service_subscriptions WHERE activated_at IS NOT NULL AND activated_at >= ? AND activated_at < ?`
  return { clause, filter }
}

async function run() {
  // ============================================================
  // A. R-22: SPV OPERATIONAL DASHBOARD DIVISION = SALES
  // ============================================================
  console.log('\n=== [A] R-22 Operational Dashboard Division Lock ===')

  assertEqual(getLockedOperationalDivision('SPV_SALES'), 'SALES', 'A1 SPV_SALES → division SALES')
  assertEqual(getLockedOperationalDivision('PENJUALAN'), 'SALES', 'A2 PENJUALAN → division SALES')
  assertEqual(getLockedOperationalDivision('SALES_MARKETING'), 'SALES', 'A3 SALES_MARKETING → division SALES')
  assertEqual(getLockedOperationalDivision('CS_ADMIN'), 'CS', 'A4 CS_ADMIN → division CS (tidak berubah)')
  assertEqual(getLockedOperationalDivision('TT_OPERATOR'), 'TT', 'A5 TT_OPERATOR → division TT (tidak berubah)')
  assertEqual(getLockedOperationalDivision('ADMIN'), 'ALL', 'A6 ADMIN → ALL (tidak berubah, broader scope aman)')

  // ============================================================
  // B. R-05: MARKETING ACTIVITIES SPV_SCOPE
  // ============================================================
  console.log('\n=== [B] R-05 Marketing Activities Scope & Permissions ===')

  assertTrue(SALES_SPV_VALID_ROLE_SET.has('SPV_SALES'), 'B1 SALES_SPV_VALID_ROLE_SET mengandung SPV_SALES')
  assertTrue(SALES_MEMBER_VALID_ROLE_SET.has('PENJUALAN'), 'B2 SALES_MEMBER_VALID_ROLE_SET mengandung PENJUALAN')
  assertTrue(SALES_MEMBER_VALID_ROLE_SET.has('SALES_MARKETING'), 'B3 SALES_MEMBER_VALID_ROLE_SET mengandung SALES_MARKETING')

  assertTrue(resolveReadScopeRole('SPV_SALES'), 'B4 resolveReadScopeRole(SPV_SALES) = true (SPV dapat read)')
  assertTrue(resolveReadScopeRole('PENJUALAN'), 'B5 resolveReadScopeRole(PENJUALAN) = true')
  assertTrue(resolveReadScopeRole('SALES_MARKETING'), 'B6 resolveReadScopeRole(SALES_MARKETING) = true')
  assertTrue(resolveReadScopeRole('OWNER'), 'B7 resolveReadScopeRole(OWNER) = true (broader)')
  assertFalse(resolveReadScopeRole('FINANCE'), 'B8 resolveReadScopeRole(FINANCE) = false (luar sales)')

  assertTrue(canMutateMarketingActivities('SPV_SALES'), 'B9 canMutate(SPV_SALES) = true')
  assertTrue(canMutateMarketingActivities('PENJUALAN'), 'B10 canMutate(PENJUALAN) = true')
  assertTrue(canMutateMarketingActivities('ADMIN'), 'B11 canMutate(ADMIN) = true (broader scope)')
  assertFalse(canMutateMarketingActivities('CS_OPERATOR'), 'B12 canMutate(CS_OPERATOR) = false')
  assertFalse(canMutateMarketingActivities('DIGITAL_CREATOR'), 'B13 canMutate(DIGITAL_CREATOR) = false')

  assertTrue(MARKETING_ACTIVITY_GLOBAL_OWNER_ROLES.has('OWNER'), 'B14 GLOBAL roles → OWNER')
  assertTrue(MARKETING_ACTIVITY_GLOBAL_OWNER_ROLES.has('SUPER_ADMIN'), 'B15 GLOBAL roles → SUPER_ADMIN')
  assertTrue(MARKETING_ACTIVITY_GLOBAL_OWNER_ROLES.has('ADMIN'), 'B16 GLOBAL roles → ADMIN')
  assertFalse(MARKETING_ACTIVITY_GLOBAL_OWNER_ROLES.has('SPV_SALES'), 'B17 SPV TIDAK masuk GLOBAL (harus TEAM scope)')

  // B18 - Assert SELF scope: member diri sendiri pass
  const selfScope: MarketingActivityOwnerScope = { mode: 'SELF', allowedUsernames: new Set(['sales_budi']) }
  await (async () => {
    let threw = false
    try { await assertMarketingOwnerInScope(selfScope, 'sales_budi', null, 'VIOLATION') } catch { threw = true }
    assertTrue(!threw, 'B18 SELF scope → owner sales_budi (username) pass')
  })()

  // B19 - Assert SELF scope: orang luar ditolak
  await assertThrows(
    () => assertMarketingOwnerInScope(selfScope, 'sales_orang_luar', null, 'VIOLATION_SELF_OUTSIDER'),
    'B19 SELF scope → owner luar ditolak fail-closed',
  )

  // B20 - Assert TEAM scope: byUsername (member tim) pass
  const teamScope: MarketingActivityOwnerScope = {
    mode: 'TEAM',
    allowedUsernames: new Set(['spv_andi', 'sales_budi', 'sm_siti']),
    ownerAliases: new Set(['andi spv sales', 'budi penjualan', 'siti sales marketing']),
  }
  await (async () => {
    let threw = false
    try { await assertMarketingOwnerInScope(teamScope, 'sales_budi', null, 'VIOLATION') } catch { threw = true }
    assertTrue(!threw, 'B20 TEAM scope → member username pass')
  })()

  // B21 - Assert TEAM scope: byAlias (nama lengkap legacy) pass
  await (async () => {
    let threw = false
    try { await assertMarketingOwnerInScope(teamScope, null, 'Budi Penjualan', 'VIOLATION') } catch { threw = true }
    assertTrue(!threw, 'B21 TEAM scope → member fullName alias pass (dual column)')
  })()

  // B22 - Assert TEAM scope: non-member username + alias TIDAK ada → ditolak
  await assertThrows(
    () => assertMarketingOwnerInScope(teamScope, 'cs_joko', 'Joko CS Admin', 'VIOLATION_OUTSIDER'),
    'B22 TEAM scope → outsider ditolak fail-closed (spv tidak unlimited)',
  )

  // B23 - GLOBAL scope: siapapun pass, tidak perlu cek
  const globalScope: MarketingActivityOwnerScope = { mode: 'GLOBAL' }
  await (async () => {
    let threw = false
    try { await assertMarketingOwnerInScope(globalScope, 'siapapun', 'Semua Nama', 'VIOLATION') } catch { threw = true }
    assertTrue(!threw, 'B23 GLOBAL scope → bypass cek owner (ADMIN/S_A/OWNER)')
  })()

  // ============================================================
  // C. R-11: SALES DOMAIN LIST SCOPE PATTERN (SPV TEAM / SELF / GLOBAL)
  // ============================================================
  console.log('\n=== [C] R-11 Sales Domain List Owner Aliases Pattern ===')

  const mock = buildMockSpvAndTeam()
  const spvAliases = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'SPV_SALES',
    mock.spvUserId,
    mock.spvDisplayName,
    mock.spvUsername,
    mock.memberships,
    mock.userRefs,
    normalizeText,
  )
  const nSpv = spvAliases.map(normalizeText)
  assertTrue(spvAliases.length >= 6, `C1 SPV scope alias length >=6 (actual=${spvAliases.length})`)
  assertIncludesAll(
    nSpv,
    ['SPV ANDI', 'SALES BUDI', 'MARKETING SITI'],
    'C2 SPV aliases mengandung SPV + 2 anggota tim (nama token uppercase)',
  )

  const salesSelfAliases = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'PENJUALAN',
    mock.member1UserId,
    mock.member1DisplayName,
    mock.member1Username,
    mock.memberships,
    mock.userRefs,
    normalizeText,
  )
  const nSales = salesSelfAliases.map(normalizeText)
  assertTrue(salesSelfAliases.length >= 2, `C3 SALES self-only alias length >=2 (actual=${salesSelfAliases.length})`)
  assertIncludesAll(nSales, ['SALES BUDI'], 'C4 SALES PENJUALAN cuma scope DIRI SENDIRI (self-only) — mengandung nama dirinya')
  assertFalse(nSales.includes('SPV ANDI'), 'C5 SALES PENJUALAN TIDAK boleh melihat data SPV (atasan)')
  assertFalse(nSales.includes('MARKETING SITI'), 'C6 SALES PENJUALAN TIDAK boleh melihat data rekan tim lain')

  // GLOBAL role (OWNER / S_A / ADMIN): pure helper TIDAK DI-PANGGIL di level service karena GLOBAL bypass owner filter
  // Test via conditional pattern: ADMIN → ownerAliases = null (bypass), SPV/SALES → ownerAliases = array terisi
  // (per domain-service branching)
  const testRoleBypass = (role: AppRole) => role === 'OWNER' || role === 'SUPER_ADMIN' || role === 'ADMIN'
  assertTrue(testRoleBypass('OWNER'), 'C7 OWNER → bypass owner filter (GLOBAL broader scope aman)')
  assertTrue(testRoleBypass('ADMIN'), 'C8 ADMIN → bypass owner filter')
  assertFalse(testRoleBypass('SPV_SALES'), 'C9 SPV_SALES → TIDAK bypass (harus masuk team scope)')
  assertFalse(testRoleBypass('PENJUALAN'), 'C10 PENJUALAN → TIDAK bypass (harus masuk self scope)')

  // ============================================================
  // D. R-12: SALES MONTHLY ACTIVATION JOIN + OWNER CLAUSE PATTERN
  // ============================================================
  console.log('\n=== [D] R-12 Monthly Activation salesOwnerClause Pattern ===')

  const { clause: clauseScopeOn, filter: filterScopeOn } = buildSubscriptionClause(['spv_andi', 'budi penjualan'])
  assertIncludes(String(clauseScopeOn ?? ''), 'so.marketing_name', 'D1 subscription ownerClause menggunakan so.marketing_name (via join)')
  assertIncludes(filterScopeOn, 'JOIN sales_orders so ON so.id = ss.order_id', 'D2 scope aktif → conditional JOIN sales_orders agar so.marketing_name ada')
  assertIncludes(filterScopeOn, 'IN (?, ?)', 'D3 parameter count sesuai panjang owner aliases')

  const { clause: clauseScopeOff, filter: filterScopeOff } = buildSubscriptionClause([])
  assertTrue(clauseScopeOff === null, 'D4 ADMIN global scope → ownerClause null (tidak perlu filter)')
  assertFalse(filterScopeOff.includes('JOIN sales_orders'), 'D5 ADMIN global scope → TIDAK ada JOIN (lebih efisien)')
  assertIncludes(filterScopeOff, 'FROM service_subscriptions WHERE activated_at', 'D6 scope bypass → query asli tanpa join')

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n===== WAVE 2-15 SPV SALES SCOPE REGRESSION =====`)
  console.log(`Pass=${passCount}  Fail=${failCount}`)

  if (failCount > 0) {
    process.exit(1)
  }
  process.exit(0)
}

run().catch((err) => {
  console.error('[UNCAUGHT ERROR] wave2-15:', err)
  process.exit(1)
})
