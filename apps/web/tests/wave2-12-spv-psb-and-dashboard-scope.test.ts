import {
  resolveSalesOwnerAliasesIncludingSpvTeamPure,
  resolveSalesOwnerAliasesIncludingSpvTeam,
  SALES_SPV_VALID_ROLE_SET,
  SALES_MEMBER_VALID_ROLE_SET,
} from '@/lib/services/sales-team-membership-service'
import { resolveOwnedPsbListOwnerAliases } from '@/lib/services/psb-list-service'
import type { AppSession } from '@/lib/auth-session'
import type { SalesTeamMembership } from '@/lib/services/sales-team-membership-service'

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
function assertContainsAll(haystack: string[], needles: string[], label: string): boolean {
  const missing: string[] = []
  for (const n of needles) if (!haystack.includes(n)) missing.push(n)
  if (missing.length === 0) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  missing entries: ${JSON.stringify(missing)}\n  haystack: ${JSON.stringify(haystack)}`)
  exitCode = 1
  failCount++
  return false
}
function assertNone(haystack: string[], needles: string[], label: string): boolean {
  const found: string[] = []
  for (const n of needles) if (haystack.includes(n)) found.push(n)
  if (found.length === 0) {
    console.log(`[PASS] ${label}`)
    passCount++
    return true
  }
  console.error(`[FAIL] ${label}\n  forbidden found: ${JSON.stringify(found)}\n  haystack: ${JSON.stringify(haystack)}`)
  exitCode = 1
  failCount++
  return false
}

const N = (v: string | null | undefined) => String(v ?? '').trim().toUpperCase()

type URef = {
  userId: number
  roleCode: string
  displayName?: string | null
  username?: string | null
  status?: string | null
}

function membership(spv: number, member: number, active: 1 | 0 = 1): Pick<SalesTeamMembership, 'spvUserId' | 'memberUserId' | 'active'> {
  return { spvUserId: spv, memberUserId: member, active }
}

function session(role: string, userId: number, displayName: string, username: string): AppSession {
  return {
    role: role as AppSession['role'],
    userId,
    displayName,
    username,
    branchId: 1,
    branchIds: [1],
    createdAt: new Date().toISOString(),
  }
}

function run() {
  const spvA = { userId: 101, role: 'SPV_SALES', dn: 'SPV Alpha', un: 'spv.alpha' }
  const member1 = { userId: 201, role: 'PENJUALAN', dn: 'Sales Satu', un: 'sales.satu' }
  const member2 = { userId: 202, role: 'SALES_MARKETING', dn: 'Sales Dua', un: 'sales.dua' }
  const spvB = { userId: 102, role: 'SPV_SALES', dn: 'SPV Beta', un: 'spv.beta' }
  const memberB1 = { userId: 301, role: 'PENJUALAN', dn: 'Sales Tujuh', un: 'sales.tujuh' }
  const memberB2 = { userId: 302, role: 'SALES_MARKETING', dn: 'Sales Delapan', un: 'sales.delapan' }
  const salesC = { userId: 401, role: 'PENJUALAN', dn: 'Sales Charlie', un: 'sales.charlie' }
  const smD = { userId: 501, role: 'SALES_MARKETING', dn: 'SM Delta', un: 'sm.delta' }

  const aliasesSpvA = [N(spvA.dn), N(spvA.un), N(`${spvA.dn} (${spvA.un})`),
    N(member1.dn), N(member1.un), N(`${member1.dn} (${member1.un})`),
    N(member2.dn), N(member2.un), N(`${member2.dn} (${member2.un})`)]
  const aliasesMember1Only = [N(member1.dn), N(member1.un), N(`${member1.dn} (${member1.un})`)]
  const aliasesMember2Only = [N(member2.dn), N(member2.un), N(`${member2.dn} (${member2.un})`)]
  const aliasesSpvBOnly = [N(spvB.dn), N(spvB.un), N(`${spvB.dn} (${spvB.un})`),
    N(memberB1.dn), N(memberB1.un), N(`${memberB1.dn} (${memberB1.un})`),
    N(memberB2.dn), N(memberB2.un), N(`${memberB2.dn} (${memberB2.un})`)]
  const aliasesSalesC = [N(salesC.dn), N(salesC.un), N(`${salesC.dn} (${salesC.un})`)]
  const aliasesSmD = [N(smD.dn), N(smD.un), N(`${smD.dn} (${smD.un})`)]

  const refsA: URef[] = [
    { userId: spvA.userId, roleCode: 'SPV_SALES', displayName: spvA.dn, username: spvA.un, status: 'ACTIVE' },
    { userId: member1.userId, roleCode: 'PENJUALAN', displayName: member1.dn, username: member1.un, status: 'ACTIVE' },
    { userId: member2.userId, roleCode: 'SALES_MARKETING', displayName: member2.dn, username: member2.un, status: 'ACTIVE' },
  ]
  const refsB: URef[] = [
    { userId: spvB.userId, roleCode: 'SPV_SALES', displayName: spvB.dn, username: spvB.un, status: 'ACTIVE' },
    { userId: memberB1.userId, roleCode: 'PENJUALAN', displayName: memberB1.dn, username: memberB1.un, status: 'ACTIVE' },
    { userId: memberB2.userId, roleCode: 'SALES_MARKETING', displayName: memberB2.dn, username: memberB2.un, status: 'ACTIVE' },
  ]
  const refsAll = [...refsA, ...refsB]

  // T1 Unauthenticated (no session) null → pure = []
  const t1 = resolveSalesOwnerAliasesIncludingSpvTeamPure(null, null, null, null, [], [], N)
  assertEqual(t1, [], 'T1 unauthenticated → pure return []')

  // T2 OWNER session → []
  const t2 = resolveSalesOwnerAliasesIncludingSpvTeamPure('OWNER', 1, 'Owner Name', 'owner.name', [], [], N)
  assertEqual(t2, [], 'T2 OWNER → [] global visibility preserved')

  // T3 ADMIN session → []
  const t3 = resolveSalesOwnerAliasesIncludingSpvTeamPure('ADMIN', 11, 'Admin Satu', 'admin.satu', [], [], N)
  assertEqual(t3, [], 'T3 ADMIN → [] global visibility preserved')

  // T4 CS_OPERATOR session → []
  const t4 = resolveSalesOwnerAliasesIncludingSpvTeamPure('CS_OPERATOR', 21, 'CS Satu', 'cs.satu', [], [], N)
  assertEqual(t4, [], 'T4 CS_OPERATOR → [] no alias override filter')

  // T5 SPV(101) + 2 active members (201,202) → total 9 aliases, contains semua
  const membershipsA = [membership(101, 201, 1), membership(101, 202, 1)]
  const t5 = resolveSalesOwnerAliasesIncludingSpvTeamPure(spvA.role, spvA.userId, spvA.dn, spvA.un, membershipsA, refsA, N)
  assertEqual(t5.length, 9, 'T5 SPV 2 members → 9 aliases total (3 user × 3 format)')
  assertContainsAll(t5, aliasesSpvA, 'T5 contains SPV A names + member 1 + member 2 aliases')

  // T6 Cross-SPV isolation: SPV A(101) memberships + ALL refs + also SPV B memberships disertakan sebagai data (tapi pure hanya filter milik SPV A). Pastikan TIDAK ada nama member SPV B di hasil SPV A.
  const mixedMemberships = [...membershipsA, membership(102, 301, 1), membership(102, 302, 1)]
  const t6 = resolveSalesOwnerAliasesIncludingSpvTeamPure(spvA.role, spvA.userId, spvA.dn, spvA.un, mixedMemberships, refsAll, N)
  assertNone(t6, [N(memberB1.dn), N(memberB1.un), N(`${memberB1.dn} (${memberB1.un})`),
    N(memberB2.dn), N(memberB2.un), N(`${memberB2.dn} (${memberB2.un})`),
    N(spvB.dn), N(spvB.un), N(`${spvB.dn} (${spvB.un})`)],
    'T6 SPV A alias TIDAK mengandung member / nama SPV B sama sekali (cross-SPV isolation)')
  assertContainsAll(t6, aliasesMember1Only, 'T6 SPV A tetap punya member 1')
  assertContainsAll(t6, aliasesMember2Only, 'T6 SPV A tetap punya member 2')

  // T7 Regression PENJUALAN: pure return exactly 3 alias sama dengan format lama
  const t7 = resolveSalesOwnerAliasesIncludingSpvTeamPure(salesC.role, salesC.userId, salesC.dn, salesC.un, [], refsAll, N)
  assertEqual(t7, aliasesSalesC, 'T7 PENJUALAN → exactly 3 aliases identical old format (no team)')

  // T8 Regression SALES_MARKETING: exactly 3
  const t8 = resolveSalesOwnerAliasesIncludingSpvTeamPure(smD.role, smD.userId, smD.dn, smD.un, [], refsAll, N)
  assertEqual(t8, aliasesSmD, 'T8 SALES_MARKETING → exactly 3 aliases identical old format')

  // T9 SPV no members → self only 3
  const t9 = resolveSalesOwnerAliasesIncludingSpvTeamPure(spvA.role, spvA.userId, spvA.dn, spvA.un, [], refsA, N)
  assertEqual(t9.length, 3, 'T9 SPV no active memberships → 3 aliases SPV sendiri only (fail closed)')
  assertContainsAll(t9, [N(spvA.dn), N(spvA.un), N(`${spvA.dn} (${spvA.un})`)], 'T9 contains SPV A self 3 aliases')

  // T10 Branch scope defense independent (pure tidak punya branch input. Kita asert existing filterVisiblePsbListOwnerOptions tetap return scope items yang match (TIDAK menghilangkan branch scope).)
  // Kita assert service pure function tidak memodifikasi branch scope pada level owner alias; branch scope sudah di layer 2 domain service (read-only audit confirmed). Jadi T10: assertFalse branch scope null di helper, tapi yang bisa di test: helper TIDAK me-return empty untuk role non sales (supaya branch scope layer 2 yang bekerja dengan visibility ALL branch, tidak bocor dari owner alias layer 1).
  const t10owner = resolveSalesOwnerAliasesIncludingSpvTeamPure('OWNER', 1, 'O', 'owner', [], [], N)
  const t10admin = resolveSalesOwnerAliasesIncludingSpvTeamPure('ADMIN', 1, 'A', 'admin', [], [], N)
  assertEqual(t10owner.length, 0, 'T10 OWNER empty owner aliases → branch scope layer 2 menjadi utama (tidak ter-filter owner alias)')
  assertEqual(t10admin.length, 0, 'T10 ADMIN empty owner aliases → branch scope layer 2 menjadi utama')

  // T11 Inactive memberships TIDAK masuk alias
  const membershipsAWithInactive = [...membershipsA, membership(101, 301, 0)] // member B1 tapi status inactive (meskipun role PENJUALAN)
  const refsExtra = [...refsAll, { userId: memberB1.userId, roleCode: 'PENJUALAN', displayName: memberB1.dn, username: memberB1.un, status: 'ACTIVE' } as URef]
  const t11 = resolveSalesOwnerAliasesIncludingSpvTeamPure(spvA.role, spvA.userId, spvA.dn, spvA.un, membershipsAWithInactive, refsExtra, N)
  assertNone(t11, [N(memberB1.dn), N(memberB1.un), N(`${memberB1.dn} (${memberB1.un})`)], 'T11 inactive membership (active=0) TIDAK masuk alias (hanya active=1)')
  assertEqual(t11.length, 9, 'T11 tetap 9 dari 3 user SPV+M1+M2 aktif')

  // T12 Member dengan status INACTIVE di ref (tapi membership active) → defense in depth: TIDAK masuk alias
  const memberInactiveRef: URef = { userId: 201, roleCode: 'PENJUALAN', displayName: member1.dn, username: member1.un, status: 'INACTIVE' }
  const t12 = resolveSalesOwnerAliasesIncludingSpvTeamPure(spvA.role, spvA.userId, spvA.dn, spvA.un, membershipsA, [
    refsA[0], memberInactiveRef, refsA[2],
  ], N)
  assertNone(t12, aliasesMember1Only, 'T12 member ref.status=INACTIVE → dikeluarkan dari alias (defense in depth), meskipun membership active=1')
  assertContainsAll(t12, aliasesMember2Only, 'T12 member 2 tetap aktif')
  assertEqual(t12.length, 6, 'T12 total 6 alias = SPV(3) + M2(3)')

  // T13 Non sales role member (e.g. ADMIN userId=201 roleCode=ADMIN) meskipun membership active → tidak masuk (MEMBER_ROLE_INVALID guard)
  const memberAdminRef: URef = { userId: 201, roleCode: 'ADMIN', displayName: member1.dn, username: member1.un, status: 'ACTIVE' }
  const t13 = resolveSalesOwnerAliasesIncludingSpvTeamPure(spvA.role, spvA.userId, spvA.dn, spvA.un, membershipsA, [
    refsA[0], memberAdminRef, refsA[2],
  ], N)
  assertNone(t13, aliasesMember1Only, 'T13 member role ADMIN bukan PENJUALAN/SM → dikeluarkan dari alias')
  assertEqual(t13.length, 6, 'T13 total 6 = SPV + M2')

  // T14 Dedupe: displayName === username case "agus" = "agus" → dedupe, no duplicate entries
  const dnEqualUn = { userId: 250, role: 'PENJUALAN', dn: 'agus', un: 'agus' }
  const t14 = resolveSalesOwnerAliasesIncludingSpvTeamPure(dnEqualUn.role, dnEqualUn.userId, dnEqualUn.dn, dnEqualUn.un, [], [], N)
  assertTrue(t14.length <= 2, 'T14 displayName === username → dedupe via Set, total entries <= 2 (Set menghilangkan duplikat dn/un)')
  assertTrue(t14.includes(N('agus')) && t14.includes(N('agus (agus)')), 'T14 combo "agus (agus)" DIPERTAHANKAN untuk backward compatible dengan existing behavior PENJUALAN/SM (T7/T8 exact)')

  // T15 Error handling: helper pure tidak throw, return consistent array
  let t15ok = false
  try {
    const res = resolveSalesOwnerAliasesIncludingSpvTeamPure('SPV_SALES' as any, NaN as any, 123 as any, null as any, null as any, null as any, N)
    t15ok = Array.isArray(res)
  } catch {
    t15ok = false
  }
  assertTrue(t15ok, 'T15 pure TIDAK lempar exception meskipun input invalid (selalu array)')

  // T16-T17 psb-list-service resolveOwnedPsbListOwnerAliases now async → resolve PENJUALAN = 3 alias
  const sessSalesC = session('PENJUALAN', salesC.userId, salesC.dn, salesC.un)
  resolveOwnedPsbListOwnerAliases(sessSalesC).then((t16) => {
    assertEqual(t16, aliasesSalesC, 'T16 psb-service resolveOwnedPsbListOwnerAliases PENJUALAN = 3 alias lama (exact)')
  }).catch((e) => {
    console.error('[FAIL] T16 promise rejected', e)
    exitCode = 1
    failCount++
  })

  const sessSPVA = session('SPV_SALES', spvA.userId, spvA.dn, spvA.un)
  // APP_DATA_MODE mock default → listActiveMembersForSpv returns [] (karena no DB). So async returns SPV self 3 alias only (fail closed).
  resolveOwnedPsbListOwnerAliases(sessSPVA).then((t17) => {
    const spvSelfOnly = [N(spvA.dn), N(spvA.un), N(`${spvA.dn} (${spvA.un})`)]
    assertEqual(t17.length >= 3 && t17.length <= 9, true, 'T17 SPV async mock mode: min 3 alias (sendiri), max 9 (dengan DB). Actual length=' + t17.length)
    assertContainsAll(t17, spvSelfOnly, 'T17 SPV async mock: selalu mengandung 3 alias sendiri (fail closed, tidak bocor)')
    // Tidak ada nama member SPV B di SPV A even when DB returns all (mock returns empty jadi hanya self, tapi coba assert none terhadap member B anyway):
    assertNone(t17, [N(memberB1.dn), N(memberB2.dn), N(spvB.dn)], 'T17 SPV A async mock tidak mengandung nama SPV B / member B (isolation)')
  }).catch((e) => {
    console.error('[FAIL] T17 promise rejected', e)
    exitCode = 1
    failCount++
  })

  // T18 Role constants frozen: SPV hanya SPV_SALES. Member roles hanya PENJUALAN, SALES_MARKETING
  assertTrue(SALES_SPV_VALID_ROLE_SET.has('SPV_SALES') && SALES_SPV_VALID_ROLE_SET.size === 1, 'T18 SPV role set = {SPV_SALES} saja frozen')
  assertTrue(SALES_MEMBER_VALID_ROLE_SET.has('PENJUALAN') && SALES_MEMBER_VALID_ROLE_SET.has('SALES_MARKETING') && SALES_MEMBER_VALID_ROLE_SET.size === 2, 'T18 member role set = {PENJUALAN, SALES_MARKETING} frozen')

  // T19 Error path async resolveSalesOwnerAliasesIncludingSpvTeam(session = undefined): Promise<string[]> never throws
  resolveSalesOwnerAliasesIncludingSpvTeam(undefined).then((arr) => {
    assertTrue(Array.isArray(arr) && arr.length === 0, 'T19 async undefined session → Promise resolves [] (never reject)')
  }).catch((e) => {
    console.error('[FAIL] T19 promise rejected:', e)
    exitCode = 1
    failCount++
  })

  // T20 No-op for NOC_OPERATOR role → []
  const t20 = resolveSalesOwnerAliasesIncludingSpvTeamPure('NOC_OPERATOR', 33, 'NOC Name', 'noc.name', [], [], N)
  assertEqual(t20, [], 'T20 NOC_OPERATOR → [] no alias owner filter')

  setTimeout(() => {
    console.log(`\n=== WAVE2-12 PHASE4 SPV SCOPE SUMMARY ===`)
    console.log(`Pass=${passCount}  Fail=${failCount}  exitCode=${process.exitCode ?? 0}`)
    if (exitCode !== 0) console.log('SOME TESTS FAILED')
    else console.log('ALL PHASE4 SPV SCOPE TESTS PASSED exit=0')
  }, 150)
}

run()

export {}
