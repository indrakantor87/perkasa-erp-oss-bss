import { APP_ROLES, type AppRole } from '@/lib/types'
import {
  REASSIGN_FULL_ACCESS_ROLES_SET,
  hasFullFieldOpsReassignAccess,
} from '@/lib/services/field-ops-service'
import {
  resolveSalesOwnerAliasesIncludingSpvTeamPure,
  SALES_SPV_VALID_ROLE_SET,
  SALES_MEMBER_VALID_ROLE_SET,
  SALES_SPV_VALID_ROLES,
  SALES_MEMBER_VALID_ROLES,
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

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toUpperCase()
}

async function run() {
  // -----------------------------------------------------------------
  // A. R-03: CS_ADMIN FULL REASSIGN ACCESS
  // -----------------------------------------------------------------

  console.log('\n=== [A] R-03 CS_ADMIN hasFullFieldOpsReassignAccess ===')

  // A1. CS_ADMIN ada di centralized set
  assertTrue(
    REASSIGN_FULL_ACCESS_ROLES_SET.has('CS_ADMIN'),
    'A1 REASSIGN_FULL_ACCESS_ROLES_SET mengandung CS_ADMIN',
  )

  // A2. CS_ADMIN dikenali helper hasFullFieldOpsReassignAccess
  assertTrue(
    hasFullFieldOpsReassignAccess('CS_ADMIN'),
    'A2 hasFullFieldOpsReassignAccess(CS_ADMIN) = true',
  )

  // A3. Role lain yang memang seharusnya FULL: OWNER, SUPER_ADMIN, ADMIN, NOC_OP, TT_OP, CS_ADMIN (6 role total)
  const expectedFullAccessRoles: AppRole[] = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR', 'CS_ADMIN']
  for (const r of expectedFullAccessRoles) {
    assertTrue(
      hasFullFieldOpsReassignAccess(r),
      `A3 hasFullFieldOpsReassignAccess(${r}) = true (expected FULL)`,
    )
  }

  // A4. Role yang TIDAK boleh full access (under-privilege → tidak dapat full)
  const nonFullRoles: AppRole[] = [
    'PENJUALAN', 'SALES_MARKETING', 'SPV_SALES',
    'CS_OPERATOR', 'FIELD_TECHNICIAN', 'DIGITAL_CREATOR',
    'DISMANTLE_OPERATOR', 'FINANCE', 'HR', 'GA',
  ]
  for (const r of nonFullRoles) {
    assertFalse(
      hasFullFieldOpsReassignAccess(r),
      `A4 hasFullFieldOpsReassignAccess(${r}) = false (expected NOT full)`,
    )
  }

  // A5. null/undefined role → false (fail safe)
  assertFalse(hasFullFieldOpsReassignAccess(null), 'A5 hasFullFieldOpsReassignAccess(null) = false')
  assertFalse(hasFullFieldOpsReassignAccess(undefined), 'A5 hasFullFieldOpsReassignAccess(undefined) = false')

  // -----------------------------------------------------------------
  // B. R-04: ISOLATION OWNER CANDIDATES (SPV team scope + bypass admin)
  // -----------------------------------------------------------------

  console.log('\n=== [B] R-04 Isolation Owner Candidates (pure logic layer) ===')

  const spvUserId = 101
  const spvDisplayName = 'SPV Andi'
  const spvUsername = 'spv.andi'
  const member1UserId = 201
  const member1DisplayName = 'Sales Budi'
  const member1Username = 'sales.budi'
  const member2UserId = 202
  const member2DisplayName = 'Marketing Siti'
  const member2Username = 'marketing.siti'

  const activeMemberships: Pick<SalesTeamMembership, 'spvUserId' | 'memberUserId' | 'active'>[] = [
    { spvUserId: spvUserId, memberUserId: member1UserId, active: 1 as const },
    { spvUserId: spvUserId, memberUserId: member2UserId, active: 1 as const },
    // inactive harus di-skip
    { spvUserId: spvUserId, memberUserId: 203, active: 0 as const },
    // SPV lain harus di-skip
    { spvUserId: 999, memberUserId: 998, active: 1 as const },
  ]

  const userRefs: AliasPureUserRef[] = [
    { userId: member1UserId, roleCode: 'PENJUALAN', status: 'ACTIVE', displayName: member1DisplayName, username: member1Username },
    { userId: member2UserId, roleCode: 'SALES_MARKETING', status: 'ACTIVE', displayName: member2DisplayName, username: member2Username },
    // status NON-ACTIVE harus di-skip
    { userId: 203, roleCode: 'PENJUALAN', status: 'INACTIVE', displayName: 'Tidak Aktif', username: 'nonactive.user' },
    // role bukan PENJUALAN/SALES_MARKETING harus di-skip
    { userId: 998, roleCode: 'FINANCE', status: 'ACTIVE', displayName: 'Finance', username: 'finance' },
  ]

  // B1. SPV_SALES: scope mencakup DIRI SENDIRI + 2 ANGGOTA TIM AKTIF
  const spvAliases = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'SPV_SALES',
    spvUserId,
    spvDisplayName,
    spvUsername,
    activeMemberships,
    [
      { userId: spvUserId, roleCode: 'SPV_SALES', status: 'ACTIVE', displayName: spvDisplayName, username: spvUsername },
      ...userRefs,
    ],
    normalizeText,
  )
  // SPV punya 3 alias sendiri (displayName, username, lowercase combos), 2 member masing-masing 3 = total 9 +-
  // Minimal harus mengandung NAMA DAN USERNAME dari 3 orang (SPV + 2 anggota)
  const normalizedSpvAliases = spvAliases.map((s) => s.toUpperCase())
  const expectedSpvNameTokens = [
    'SPV ANDI', 'SPV.ANDI',
    'SALES BUDI', 'SALES.BUDI',
    'MARKETING SITI', 'MARKETING.SITI',
  ]
  assertIncludesAll(
    normalizedSpvAliases,
    expectedSpvNameTokens,
    'B1 SPV_SALES aliases mengandung SPV sendiri + 2 anggota aktif (nama & username)',
  )
  assertTrue(
    spvAliases.length >= 6,
    `B1 SPV_SALES aliases jumlah >= 6 (actual: ${spvAliases.length})`,
  )

  // B2. SPV_SALES tanpa membership data (fallback) => minimal alias sendiri
  const spvSoloAliases = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'SPV_SALES',
    spvUserId,
    spvDisplayName,
    spvUsername,
    [],
    [{ userId: spvUserId, roleCode: 'SPV_SALES', status: 'ACTIVE', displayName: spvDisplayName, username: spvUsername }],
    normalizeText,
  )
  assertIncludesAll(
    spvSoloAliases.map((s) => s.toUpperCase()),
    ['SPV ANDI', 'SPV.ANDI'],
    'B2 SPV_SALES tanpa membership => mengandung alias sendiri minimal nama+username',
  )

  // B3. PENJUALAN dan SALES_MARKETING => self-scoped, TIDAK expand anggota tim
  const penjualanAliases = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'PENJUALAN',
    member1UserId,
    member1DisplayName,
    member1Username,
    activeMemberships,
    userRefs,
    normalizeText,
  )
  assertIncludesAll(
    penjualanAliases.map((s) => s.toUpperCase()),
    ['SALES BUDI', 'SALES.BUDI'],
    'B3 PENJUALAN (bukan SPV) aliases => hanya self (SALES BUDI)',
  )
  // Pastikan TIDAK ada SPV dan tidak ada member 2 di penjualan alias
  assertFalse(
    penjualanAliases.some((a) => a.toUpperCase().includes('SPV ANDI') || a.toUpperCase().includes('SITI')),
    'B3 PENJUALAN aliases TIDAK mengandung nama SPV atau anggota tim lain',
  )

  const marketingAliases = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'SALES_MARKETING',
    member2UserId,
    member2DisplayName,
    member2Username,
    activeMemberships,
    userRefs,
    normalizeText,
  )
  assertIncludesAll(
    marketingAliases.map((s) => s.toUpperCase()),
    ['MARKETING SITI', 'MARKETING.SITI'],
    'B3 SALES_MARKETING aliases => hanya self (MARKETING SITI)',
  )

  // B4. Role BYPASS (OWNER, SUPER_ADMIN, ADMIN, CS_ADMIN) => resolveSalesOwnerAliasesIncludingSpvTeam return []
  //     (bypass filter isolation dilakukan di page-level via BYPASS_MARKETING_OWNER_FILTER_ROLES set, tapi di pure helper level return [] untuk non-sales/non-spv role)
  for (const bypassRole of ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'CS_ADMIN'] as const) {
    const empty = resolveSalesOwnerAliasesIncludingSpvTeamPure(
      bypassRole,
      1,
      'Admin',
      'admin',
      null,
      null,
      normalizeText,
    )
    assertEqual(
      empty,
      [],
      `B4 ${bypassRole} (bypass role) pure helper return [] untuk owner aliases scope sales (bypass logic di page level filter)`,
    )
  }

  // B5. SPV membership dengan member ROLE BUKAN PENJUALAN/SALES_MARKETING => di-skip
  const badRefs: AliasPureUserRef[] = [
    { userId: spvUserId, roleCode: 'SPV_SALES', status: 'ACTIVE', displayName: spvDisplayName, username: spvUsername },
    { userId: member1UserId, roleCode: 'FINANCE', status: 'ACTIVE', displayName: member1DisplayName, username: member1Username },
    { userId: member2UserId, roleCode: 'HR', status: 'ACTIVE', displayName: member2DisplayName, username: member2Username },
  ]
  const spvBadRoleMembers = resolveSalesOwnerAliasesIncludingSpvTeamPure(
    'SPV_SALES',
    spvUserId,
    spvDisplayName,
    spvUsername,
    activeMemberships,
    badRefs,
    normalizeText,
  )
  assertFalse(
    spvBadRoleMembers.some((a) => a.toUpperCase().includes('BUDI') || a.toUpperCase().includes('SITI')),
    'B5 SPV_SALES anggota tim dengan role FINANCE/HR (bukan PENJUALAN/SALES_MARKETING) => di-skip dari alias scope',
  )
  assertIncludesAll(
    spvBadRoleMembers.map((s) => s.toUpperCase()),
    ['SPV ANDI', 'SPV.ANDI'],
    'B5 SPV_SALES dengan member role invalid => tetap mengandung alias DIRI sendiri',
  )

  // -----------------------------------------------------------------
  // C. R-01/R-02: Sidebar visibleFor & workspace SPV_SALES
  //    (pure logic side: role constants, tidak perlu import React component - verifikasi role membership)
  // -----------------------------------------------------------------

  console.log('\n=== [C] R-01/R-02 Sidebar SPV_SALES Whitelist (role membership verification) ===')

  // C1. SPV_SALES termasuk APP_ROLES canonical (existing, baseline)
  assertTrue(APP_ROLES.includes('SPV_SALES'), 'C1 SPV_SALES ada di APP_ROLES canonical types')

  // C2. SPV termasuk SALES_SPV_VALID_ROLE_SET (SPV pure role whitelist service)
  assertTrue(SALES_SPV_VALID_ROLE_SET.has('SPV_SALES'), 'C2 SPV_SALES ada di SALES_SPV_VALID_ROLE_SET membership service')

  // C2b. SPV ada di array readonly SALES_SPV_VALID_ROLES juga
  assertTrue(SALES_SPV_VALID_ROLES.includes('SPV_SALES'), 'C2b SPV_SALES ada di SALES_SPV_VALID_ROLES readonly array')

  // C3. PENJUALAN dan SALES_MARKETING ada di SALES_MEMBER_VALID_ROLE_SET (member role whitelist)
  assertTrue(SALES_MEMBER_VALID_ROLE_SET.has('PENJUALAN'), 'C3 SALES_MEMBER_VALID_ROLE_SET mengandung PENJUALAN')
  assertTrue(SALES_MEMBER_VALID_ROLE_SET.has('SALES_MARKETING'), 'C3 SALES_MEMBER_VALID_ROLE_SET mengandung SALES_MARKETING')
  assertTrue(SALES_MEMBER_VALID_ROLES.includes('PENJUALAN'), 'C3b SALES_MEMBER_VALID_ROLES readonly array mengandung PENJUALAN')
  assertTrue(SALES_MEMBER_VALID_ROLES.includes('SALES_MARKETING'), 'C3b SALES_MEMBER_VALID_ROLES readonly array mengandung SALES_MARKETING')

  // C4. SPV_SALES BUKAN anggota MEMBER_VALID_ROLE_SET (pemisahan SPV vs MEMBER)
  assertFalse(SALES_MEMBER_VALID_ROLE_SET.has('SPV_SALES'), 'C4 SPV_SALES BUKAN anggota SALES_MEMBER_VALID_ROLE_SET (pemisahan SPV vs member murni)')

  // C5. CS_ADMIN BUKAN anggota SPV_VALID dan BUKAN anggota MEMBER_VALID (cross-role pollution prevention)
  assertFalse(SALES_SPV_VALID_ROLE_SET.has('CS_ADMIN'), 'C5 CS_ADMIN TIDAK masuk SALES_SPV_VALID_ROLE_SET (tidak ada cross-role pollution)')
  assertFalse(SALES_MEMBER_VALID_ROLE_SET.has('CS_ADMIN'), 'C5 CS_ADMIN TIDAK masuk SALES_MEMBER_VALID_ROLE_SET (tidak ada cross-role pollution)')

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------

  console.log(`\n=== WAVE2-14 BATCH 1 ROLE & WORKFLOW GAPS REGRESSION SUMMARY ===`)
  console.log(`Pass=${passCount}  Fail=${failCount}  exitCode=${exitCode}`)

  if (exitCode === 0 && passCount >= 20) {
    console.log('ALL 20+ BATCH 1 REGRESSION INVARIANTS (pure logic layer) PASSED exit=0')
  } else if (exitCode !== 0) {
    console.error(`FAIL: ada ${failCount} assertion gagal`)
  }

  process.exit(exitCode)
}

run().catch((err) => {
  console.error('UNHANDLED ERROR wave2-14:', err)
  process.exit(2)
})
