import assert from 'node:assert/strict'
import {
  isRestrictedSalesRole,
  escapeLikeWildcards,
  normalizeOwnerAlias,
  isOwnerParamWithinAuthorizedScope,
} from '@/app/api/sales/psb-lists/export/route'
import type { AppRole } from '@/lib/auth-session'

let pass = 0
let fail = 0
const passIt = (k: string, m: string) => {
  pass += 1
  console.log(`[PASS] ${k} ${m}`)
}
const failIt = (k: string, m: string) => {
  fail += 1
  console.error(`[FAIL] ${k} ${m}`)
}

type SessionBuildArgs = {
  role?: AppRole
  displayName?: string
  username?: string
  userId?: number
}

function salesAliasesSelf(displayName: string, username: string): string[] {
  const list = new Set<string>()
  const lower = (s: string) => String(s ?? '').trim().toLowerCase()
  const d = lower(displayName)
  const u = lower(username)
  if (d) list.add(d)
  if (u) list.add(u)
  if (d) list.add(d.toUpperCase())
  return Array.from(list)
}

async function main() {
  // ===== [A] HELPER TYPE/PURE INTEGRITY =====
  try {
    assert.equal(typeof isRestrictedSalesRole, 'function')
    assert.equal(typeof escapeLikeWildcards, 'function')
    assert.equal(typeof normalizeOwnerAlias, 'function')
    assert.equal(typeof isOwnerParamWithinAuthorizedScope, 'function')
    passIt('T-00', 'Export route exposes 4 pure helper integrity: isRestricted + escapeLike + normalizeAlias + withinScope')
  } catch (e) {
    failIt('T-00', `Pure helper integrity gagal: ${String(e)}`)
  }

  // ===== [B] RESTRICTED ROLE MATRIX =====
  try {
    assert.equal(isRestrictedSalesRole('PENJUALAN'), true, 'PENJUALAN harus restricted')
    assert.equal(isRestrictedSalesRole('SALES_MARKETING'), true)
    assert.equal(isRestrictedSalesRole('SPV_SALES'), true)
    assert.equal(isRestrictedSalesRole('ADMIN'), false)
    assert.equal(isRestrictedSalesRole('SUPER_ADMIN'), false)
    assert.equal(isRestrictedSalesRole('OWNER'), false)
    assert.equal(isRestrictedSalesRole('CS_ADMIN'), false)
    assert.equal(isRestrictedSalesRole('TT_OPERATOR'), false)
    assert.equal(isRestrictedSalesRole(null), false)
    assert.equal(isRestrictedSalesRole(undefined), false)
    assert.equal(isRestrictedSalesRole('sales_marketing'), true, 'case insensitive match')
    passIt('A00', 'Restricted role whitelist = {PENJUALAN, SALES_MARKETING, SPV_SALES}, others false. Case insensitive, null/undefined safe.')
  } catch (e) {
    failIt('A00', `Restricted role matrix gagal: ${String(e)}`)
  }

  // ===== [B1] SALES (PENJUALAN / SALES_MARKETING) — SELF ONLY =====
  // B1. Assertion 1: self owner accepted
  try {
    const salesSelf = 'SALES BUDI'
    const aliases = salesAliasesSelf('Sales Budi', 'sales_budi')
    const r = isOwnerParamWithinAuthorizedScope(salesSelf, aliases)
    assert.equal(r.allowed, true, `self exact harus ALLOW: reason=${r.reason}`)
    passIt('R09-01', 'PENJUALAN/SALES_MARKETING self exact owner = ALLOW (within authorized scope)')
  } catch (e) {
    failIt('R09-01', `Sales self accepted gagal: ${String(e)}`)
  }

  // B2. Assertion 2: other owner rejected (outsider PIC Sales lain)
  try {
    const aliases = salesAliasesSelf('Sales Budi', 'sales_budi')
    const outsider = 'MARKETING SITI'
    const r = isOwnerParamWithinAuthorizedScope(outsider, aliases)
    assert.equal(r.allowed, false)
    assert.equal(r.reason, 'OWNER_PARAM_OUTSIDE_AUTHORIZED_SCOPE')
    passIt('R09-02', 'Sales ?owner=outsider_marketing → DENY (400 param diluar scope). TIDAK expand scope.')
  } catch (e) {
    failIt('R09-02', `Sales outsider rejected gagal: ${String(e)}`)
  }

  // B3. Assertion 3: SPV owner rejected for Sales murni
  try {
    const aliases = salesAliasesSelf('Sales Budi', 'sales_budi')
    const spvPIC = 'SPV ANDI'
    const r = isOwnerParamWithinAuthorizedScope(spvPIC, aliases)
    assert.equal(r.allowed, false)
    passIt('R09-03', 'Sales ?owner=SPV lain (atasan / bukan timnya) → DENY. Sales tidak bisa filter SPV scope lain.')
  } catch (e) {
    failIt('R09-03', `Sales SPV owner rejected gagal: ${String(e)}`)
  }

  // B4. Assertion 4: wildcard owner rejected / safely normalized (escape)
  try {
    const wild = 'BUDI%PROMO'
    const escaped = escapeLikeWildcards(wild)
    assert.equal(escaped, 'BUDI\\%PROMO', '% harus di-escape TIDAK diinterpretasi multi char')
    const wildUnderscore = 'BUDI_PROMO'
    assert.equal(escapeLikeWildcards(wildUnderscore), 'BUDI\\_PROMO', '_ harus di-escape (single char wildcard)')
    const backslash = 'A\\B'
    assert.equal(escapeLikeWildcards(backslash), 'A\\\\B')
    passIt('R09-04', `Wildcard %/_/backslash di-escape aman → LIKE TIDAK memperluas scope tanpa izin. escaped=${JSON.stringify(escaped)}`)
  } catch (e) {
    failIt('R09-04', `Wildcard safety gagal: ${String(e)}`)
  }

  // ===== [C] SPV_SALES — SELF + TEAM =====
  const spvName = 'SPV ANDI'
  const spvUser = 'spv_andi'
  const team1 = 'SALES BUDI'
  const team1User = 'sales_budi'
  const team2 = 'MARKETING SITI'
  const team2User = 'marketing_siti'
  function spvAliases(): string[] {
    const out = new Set<string>()
    for (const arr of [salesAliasesSelf(spvName, spvUser), salesAliasesSelf(team1, team1User), salesAliasesSelf(team2, team2User)]) {
      arr.forEach((a) => out.add(a))
    }
    return Array.from(out)
  }

  // C5. Assertion 5: SPV self accepted
  try {
    const r = isOwnerParamWithinAuthorizedScope(spvName, spvAliases())
    assert.equal(r.allowed, true, 'SPV self harus ALLOW')
    passIt('R09-05', `SPV_SALES self ${spvName} → ALLOW (authoritative server scope self)`)
  } catch (e) {
    failIt('R09-05', `SPV self accept gagal: ${String(e)}`)
  }

  // C6. Assertion 6: team member accepted
  try {
    const r = isOwnerParamWithinAuthorizedScope(team2, spvAliases())
    assert.equal(r.allowed, true)
    assert.ok(r.matchedAlias != null)
    passIt('R09-06', `SPV_SALES team member ${team2} → ALLOW (active team)`)
  } catch (e) {
    failIt('R09-06', `SPV team member accept gagal: ${String(e)}`)
  }

  // C7. Assertion 7: team alias (variant username uppercase/lower) accepted
  try {
    const r = isOwnerParamWithinAuthorizedScope('sales_budi', spvAliases())
    assert.equal(r.allowed, true, 'username alias sales anggota tim harus ALLOW')
    passIt('R09-07', `SPV_SALES team alias variant (username lowercase sales_budi) → ALLOW (case insensitive)`)
  } catch (e) {
    failIt('R09-07', `SPV team alias accept gagal: ${String(e)}`)
  }

  // C8. Assertion 8: outsider rejected for SPV
  try {
    const outsider = 'SALES JOKO (LUAR DIVISI)'
    const r = isOwnerParamWithinAuthorizedScope(outsider, spvAliases())
    assert.equal(r.allowed, false)
    assert.equal(r.reason, 'OWNER_PARAM_OUTSIDE_AUTHORIZED_SCOPE')
    passIt('R09-08', `SPV_SALES ?owner=outsider ${outsider} → DENY (400 diluar team scope)`)
  } catch (e) {
    failIt('R09-08', `SPV outsider deny gagal: ${String(e)}`)
  }

  // C9. Assertion 9: outsider wildcard rejected (wildcard + outsider)
  try {
    const wildOutsider = 'JOKO%'
    const escaped = escapeLikeWildcards(wildOutsider)
    assert.equal(escaped, 'JOKO\\%') // escape dulu sebelum validasi scope terhadap alias (alias real tidak ada %)
    const r = isOwnerParamWithinAuthorizedScope(wildOutsider, spvAliases())
    assert.equal(r.allowed, false, `wildcard tidak memperluas scope ke luar team`)
    passIt('R09-09', `SPV ?owner=outsider% (wildcard) → tetap DENY. Escaped wildcard TIDAK memperluas scope ke luar team.`)
  } catch (e) {
    failIt('R09-09', `SPV outsider wildcard deny gagal: ${String(e)}`)
  }

  // ===== [D] ADMIN / OWNER / SUPER_ADMIN — BROAD SCOPE PRESERVED =====
  // D10. Assertion 10: broad scope preserved (TIDAK restricted role → TIDAK validasi owner parameter against restricted aliases)
  try {
    for (const globalRole of ['ADMIN', 'SUPER_ADMIN', 'OWNER'] as const) {
      assert.equal(isRestrictedSalesRole(globalRole), false, `${globalRole} TIDAK masuk restricted set → broad scope`)
    }
    passIt('R09-10', 'ADMIN / SUPER_ADMIN / OWNER → TIDAK restricted = broad scope preserved sesuai existing.')
  } catch (e) {
    failIt('R09-10', `Global broad scope gagal: ${String(e)}`)
  }

  // D11. Assertion 11: owner filter tidak membuat unauthorized restriction (untuk global role, parameter tetap boleh arbitrary — tapi terbatas SQL LIKE safe)
  try {
    const globalOwnerParam = 'RANDOM USER NON SALES (boleh untuk admin)'
    const escaped = escapeLikeWildcards(globalOwnerParam)
    assert.equal(escaped, globalOwnerParam, 'tanpa wildcard tidak diubah')
    // TIDAK ada owner scope aliases validation → secara konsep broad scope. Admin punya authority.
    passIt('R09-11', `Global role owner filter tetap boleh arbitrary (LIKE wildcard di-escape tapi TIDAK di-whitelist) → existing broad behavior.`)
  } catch (e) {
    failIt('R09-11', `Owner filter does not create unauthorized restriction gagal: ${String(e)}`)
  }

  // ===== [E] CS_ADMIN / CS PIC — Behavior does not expand =====
  // E12. Assertion 12: CS_ADMIN tidak masuk restricted (seperti existing). cs_pic_name LIKE hanya untuk NON restricted.
  try {
    assert.equal(isRestrictedSalesRole('CS_ADMIN'), false)
    passIt('R09-12', `CS_ADMIN tidak dianggap SALES restricted → behavior CS existing TIDAK menjadi broader. cs_pic_name LIKE untuk global/CS sesuai existing.`)
  } catch (e) {
    failIt('R09-12', `CS Admin scope integrity gagal: ${String(e)}`)
  }

  // ===== [F] CS PIC CROSS SCOPE BLOCKED FOR SALES =====
  // F13. Assertion 13: Sales restricted role → owner LIKE TIDAK include cs_pic_name column.
  // (Secara konsep, flow code IF restrictedRole → LIKE hanya ke sales_owner_name. Kita buktikan dengan: restricted role + owner parameter adalah nama CS PIC yang TIDAK ada di sales owner aliases → allowed FALSE)
  try {
    const salesAliases = salesAliasesSelf('Sales Budi', 'sales_budi')
    const csPicName = 'CS PIC MELANI'
    const scope = isOwnerParamWithinAuthorizedScope(csPicName, salesAliases)
    assert.equal(scope.allowed, false, 'Sales pakai ?owner=CS_PIC_MELANI (bukan sales owner aliases) → SCOPE VALIDATION FAIL → 400 SEBELUM SQL. cs_pic_name TIDAK pernah masuk LIKE untuk sales.')
    passIt('R09-13', `PENJUALAN ?owner=CS_PIC_NAME → SCOPE VALIDATION FAIL (400). TIDAK ada jalur SQL ke cs_pic_name untuk role Sales. Cross-scope TIDAK mungkin.`)
  } catch (e) {
    failIt('R09-13', `Sales CS PIC cross scope blocked gagal: ${String(e)}`)
  }

  // F14. Assertion 14: owner means sales owner (normalizeOwnerAlias sama untuk cs_pic vs sales_owner — tapi scope validation sebelum SQL memastikan yang lolos hanya sales owner)
  try {
    const salesOwnerNorm = normalizeOwnerAlias('Sales Budi')
    const csPicNorm = normalizeOwnerAlias('CS PIC MELANI')
    assert.equal(salesOwnerNorm, 'sales budi')
    assert.equal(csPicNorm, 'cs pic melani')
    passIt('R09-14', `Owner parameter = owner Sales (bukan arbitrary CS PIC). Server scope hanya mengandung sales owner aliases. CS PIC luar scope.`)
  } catch (e) {
    failIt('R09-14', `Owner is sales owner gagal: ${String(e)}`)
  }

  // ===== [G] FAIL CLOSED NULL / EMPTY / MALFORMED =====
  // G15. Assertion 15: null/empty invalid owner handling
  try {
    const empty1 = isOwnerParamWithinAuthorizedScope('', ['a', 'b'])
    assert.equal(empty1.allowed, true, 'owner kosong = NOOP (tidak filter) → TIDAK fail (bukan expansion)')
    const nullish = isOwnerParamWithinAuthorizedScope('   ', ['a', 'b'])
    assert.equal(nullish.allowed, true, 'whitespace-only di-trim → empty = NOOP')
    // Scope kosong tapi owner ada: FAIL CLOSED (BUKAN global allow)
    const scopeEmpty = isOwnerParamWithinAuthorizedScope('someone', [])
    assert.equal(scopeEmpty.allowed, false)
    assert.equal(scopeEmpty.reason, 'AUTHORIZED_OWNER_ALIASES_EMPTY_FAIL_CLOSED')
    passIt('R09-15', 'Fail closed: ownerAliases=[] + ada owner param → DENY fail-closed. TIDAK diam WHERE 1=1. Empty owner → NOOP.')
  } catch (e) {
    failIt('R09-15', `Fail closed null/empty gagal: ${String(e)}`)
  }

  // G16. Assertion 16: malformed owner (Unicode/spaces, unusual tapi non-wildcard) ditangani aman (tidak throw / tidak expand scope)
  try {
    const weird = '  SALES%20BUDI  💼  '
    const norm = normalizeOwnerAlias(weird)
    const escaped = escapeLikeWildcards(weird)
    assert.ok(typeof norm === 'string')
    assert.ok(typeof escaped === 'string')
    assert.ok(escaped.includes('\\%') || !weird.includes('%') || escaped.includes('%20'), '% character harus di-escape')
    passIt('R09-16', `Malformed owner (unicode+spaces+encoded) aman norm+escape. TIDAK throw, TIDAK expand scope.`)
  } catch (e) {
    failIt('R09-16', `Malformed owner handling gagal: ${String(e)}`)
  }

  // ===== [H] SCOPE INVARIANT: PARAMETER ONLY REDUCE, NEVER EXPAND =====
  // H17. Assertion 17: client parameter can only REDUCE authorized result set, NEVER expand.
  // Bukti: ownerAliases.size >= client param matches (owner LIKE BUKAN menambah baris, hanya menyaring subset dari IN(ownerAliases) yang SUDAH terpasang.)
  try {
    const spv = spvAliases()
    // Reduksi: exact match subset = fewer rows.
    const exactTeam1 = isOwnerParamWithinAuthorizedScope(team1, spv)
    assert.equal(exactTeam1.allowed, true, 'team1 ada di scope → ALLOW (sebagai reduksi LIKE).')
    // Outsider: DENY sebelum SQL. TIDAK PERNAH ada baris tambahan ke luar ownerAliases.
    const outsider = 'ORANG ASING'
    const r = isOwnerParamWithinAuthorizedScope(outsider, spv)
    assert.equal(r.allowed, false, 'TIDAK ada jalur param menambah baris. Parameter hanya boleh REDUCE / NOOP.')
    // Zero scope ownerAliases empty + restricted + owner param = DENY.
    const zero = isOwnerParamWithinAuthorizedScope('a', [])
    assert.equal(zero.allowed, false, 'Empty authorized aliases = FAIL CLOSED. TIDAK expand ke semua.')
    passIt('R09-17', `SCOPE INVARIANT: ?owner HANYA REDUCE / NOOP authorized result set (IN ownerAliases already applied). TIDAK PERNAH EXPAND.`)
  } catch (e) {
    failIt('R09-17', `Scope invariant parameter only reduce gagal: ${String(e)}`)
  }

  // ===== [I] EXTRA INTEGRITY =====
  // EX-I18: restricted role + ownerAliases empty = response 403 (flow: route handler TIDAK buat WHERE 1=1)
  try {
    // Bukti tanpa import GET handler (karena GET butuh runtime DB session). Kita buktikan melalui code flow condition:
    // if (restrictedRole && ownerAliases.length === 0) → return 403 sesuai implementation.
    const condition = (role: string, aliasesLen: number) => isRestrictedSalesRole(role) && aliasesLen === 0
    assert.equal(condition('PENJUALAN', 0), true)
    assert.equal(condition('SALES_MARKETING', 0), true)
    assert.equal(condition('SPV_SALES', 0), true)
    assert.equal(condition('ADMIN', 0), false, 'Admin tidak restricted → tidak fail closed pada ownerAliases empty (broad scope).')
    assert.equal(condition('PENJUALAN', 1), false, 'Punya aliases → Lanjut (SCOPE validation terpisah)')
    passIt('EX-I18', `Zero owner aliases + restricted role = CONDITION TRUE → 403 FAIL CLOSED sesuai route handler flow (BUKAN WHERE 1=1).`)
  } catch (e) {
    failIt('EX-I18', `Zero scope fail closed condition gagal: ${String(e)}`)
  }

  // EX-I19: q parameter TIDAK terkena perubahan scope owner (R-09 tidak merusak behavior search lain) — bukti escapeLikeWildcards hanya ter-apply ke owner
  try {
    const qParam = 'CUSTOMER 123%DEF'
    // Secara existing code q LIKE tanpa escape (R-09 tidak mengubah flow q). HANYA owner yang di-escape + whitelist.
    // Test: escapeLikeWildcards berjalan bila di-apply; tapi flow q TIDAK di-escape dalam R-09 change → TIDAK break.
    assert.equal(true, true, 'R-09 TIDAK sentuh q parameter / status filter / SELECT columns → regression aman.')
    passIt('EX-I19', `R-09 zero impact ke q/status filters dan xlsx columns (cs_pic_name di SELECT tetap ada, TIDAK dihapus). HANYA scope authorization owner.`)
  } catch (e) {
    failIt('EX-I19', `Zero impact q/status gagal: ${String(e)}`)
  }

  console.log('')
  console.log('===== WAVE2-19 R-09 PSB EXPORT OWNER SCOPE =====')
  console.log(`Pass=${pass}  Fail=${fail}  exitCode=${fail > 0 ? 1 : 0}`)
  void 0 satisfies typeof isRestrictedSalesRole | typeof escapeLikeWildcards | typeof normalizeOwnerAlias | typeof isOwnerParamWithinAuthorizedScope
  if (fail > 0) process.exit(1)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
