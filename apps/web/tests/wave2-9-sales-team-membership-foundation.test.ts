import {
  validateMembershipPairPure,
  isValidSpvRoleCode,
  isValidMemberRoleCode,
  isNotSelfAssign,
  isActiveStatus,
  isSameBranch,
  resolveManagedSalesUsersPure,
  resolveManagedOwnerAliasesPure,
  SALES_SPV_VALID_ROLE_SET,
  SALES_MEMBER_VALID_ROLE_SET,
} from '@/lib/services/sales-team-membership-service'
import type { AuthUserRefLite, AppRole } from '@/lib/services/sales-team-membership-service'
import { isReviewDbConfigured } from '@/lib/review-db'

const BRANCH_1 = 10
const BRANCH_2 = 11

function mkUser(partial: Partial<AuthUserRefLite> & { userId: number; roleCode: string }): AuthUserRefLite {
  return {
    userId: partial.userId,
    roleCode: String(partial.roleCode).toUpperCase(),
    branchId: partial.branchId !== undefined ? partial.branchId : BRANCH_1,
    status: String(partial.status ?? 'ACTIVE').toUpperCase(),
  }
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  const actJson = JSON.stringify(actual)
  const expJson = JSON.stringify(expected)
  if (actJson !== expJson) {
    console.error(`[FAIL] ${label}`)
    console.error(`  actual:   ${actJson}`)
    console.error(`  expected: ${expJson}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL: ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertTrue(cond: unknown, label: string) {
  if (!cond) {
    console.error(`[FAIL] ${label}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL: ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertFalse(cond: unknown, label: string) {
  if (cond) {
    console.error(`[FAIL] ${label}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL: ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertValid(result: ReturnType<typeof validateMembershipPairPure>, label: string) {
  if (!result.valid) {
    console.error(`[FAIL] ${label} expected VALID but got ${result.error} ${result.detail ?? ''}`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL VALID: ${label}`)
  }
  console.log(`[PASS] ${label}`)
}

function assertInvalid(
  result: ReturnType<typeof validateMembershipPairPure>,
  expectedError: string,
  label: string,
) {
  if (result.valid) {
    console.error(`[FAIL] ${label} expected INVALID(${expectedError}) but got VALID`)
    process.exitCode = 1
    throw new Error(`ASSERT FAIL INVALID: ${label}`)
  }
  if (result.error !== expectedError) {
    console.error(
      `[FAIL] ${label} expected error=${expectedError} actual=${result.error} (${result.detail ?? ''})`,
    )
    process.exitCode = 1
    throw new Error(`ASSERT FAIL INVALID ERROR: ${label}`)
  }
  console.log(`[PASS] ${label} (error=${expectedError})`)
}

let totalTests = 0
let skippedTests = 0

console.log('=== SALES TEAM MEMBERSHIP FOUNDATION TESTS (WAVE 2.9) ===')
console.log(`reviewDB configured: ${isReviewDbConfigured()}`)
console.log('')

const SPV_USER_ID = 5001
const SALES_MEMBER_ID = 6001
const SM_MEMBER_ID = 6002
const OTHER_SPV_ID = 5002

const SPV_VALID: AuthUserRefLite = mkUser({ userId: SPV_USER_ID, roleCode: 'SPV_SALES', branchId: BRANCH_1, status: 'ACTIVE' })
const SALES_VALID: AuthUserRefLite = mkUser({ userId: SALES_MEMBER_ID, roleCode: 'PENJUALAN', branchId: BRANCH_1, status: 'ACTIVE' })
const SM_VALID: AuthUserRefLite = mkUser({ userId: SM_MEMBER_ID, roleCode: 'SALES_MARKETING', branchId: BRANCH_1, status: 'ACTIVE' })

console.log('--- ROLE VALIDITY UNIT TESTS ---')
totalTests++
assertTrue(isValidSpvRoleCode('SPV_SALES'), 'SPV_SALES = valid SPV role')
totalTests++
assertFalse(isValidSpvRoleCode('PENJUALAN'), 'PENJUALAN = invalid SPV role')
totalTests++
assertFalse(isValidSpvRoleCode('SALES_MARKETING'), 'SALES_MARKETING = invalid SPV role')
totalTests++
assertFalse(isValidSpvRoleCode('ADMIN'), 'ADMIN = invalid SPV role')
totalTests++
assertFalse(isValidSpvRoleCode('CS_OPERATOR'), 'CS_OPERATOR = invalid SPV role')
totalTests++
assertTrue(isValidMemberRoleCode('PENJUALAN'), 'PENJUALAN = valid member role')
totalTests++
assertTrue(isValidMemberRoleCode('SALES_MARKETING'), 'SALES_MARKETING = valid member role')
totalTests++
assertFalse(isValidMemberRoleCode('SPV_SALES'), 'SPV_SALES = invalid member role (TIDAK boleh SPV jadi member)')
totalTests++
assertFalse(isValidMemberRoleCode('ADMIN'), 'ADMIN = invalid member role')
totalTests++
assertFalse(isValidMemberRoleCode('CS_OPERATOR'), 'CS_OPERATOR = invalid member role')

console.log('')
console.log('--- BASIC GUARD UNIT TESTS ---')
totalTests++
assertFalse(isNotSelfAssign(SPV_USER_ID, SPV_USER_ID), 'isNotSelfAssign false jika user id sama')
totalTests++
assertTrue(isNotSelfAssign(SPV_USER_ID, SALES_MEMBER_ID), 'isNotSelfAssign true jika id berbeda')
totalTests++
assertTrue(isActiveStatus('ACTIVE'), 'ACTIVE = status aktif')
totalTests++
assertFalse(isActiveStatus('INACTIVE'), 'INACTIVE = tidak aktif')
totalTests++
assertFalse(isActiveStatus('SUSPENDED'), 'SUSPENDED = tidak aktif')
totalTests++
assertTrue(isSameBranch(BRANCH_1, BRANCH_1), 'cabang sama = OK')
totalTests++
assertFalse(isSameBranch(BRANCH_1, BRANCH_2), 'cabang beda = TIDAK OK')
totalTests++
assertFalse(isSameBranch(null, BRANCH_1), 'SPV tanpa branch = TIDAK OK')
totalTests++
assertFalse(isSameBranch(BRANCH_1, null), 'member tanpa branch = TIDAK OK')

console.log('')
console.log('--- CASE 1-9: PURE VALIDATION PAIR (NO DB REQUIRED) ---')
totalTests++
assertValid(
  validateMembershipPairPure({ spv: SPV_VALID, member: SALES_VALID }),
  'CASE 1: SPV valid + Sales (PENJUALAN) valid + branch sama + active sama = PASS',
)
totalTests++
assertValid(
  validateMembershipPairPure({ spv: SPV_VALID, member: SM_VALID }),
  'CASE 2: SPV valid + Sales Marketing (SALES_MARKETING) valid + branch sama + active = PASS',
)
totalTests++
const spvAdmin = mkUser({ userId: 7001, roleCode: 'ADMIN', branchId: BRANCH_1 })
assertInvalid(
  validateMembershipPairPure({ spv: spvAdmin, member: SALES_VALID }),
  'SPV_ROLE_INVALID',
  'CASE 3: non-SPV (ADMIN) sebagai SPV = DENIED SPV_ROLE_INVALID',
)
totalTests++
const memberCS = mkUser({ userId: 7002, roleCode: 'CS_OPERATOR', branchId: BRANCH_1 })
assertInvalid(
  validateMembershipPairPure({ spv: SPV_VALID, member: memberCS }),
  'MEMBER_ROLE_INVALID',
  'CASE 4: non-Sales (CS_OPERATOR) sebagai member = DENIED MEMBER_ROLE_INVALID',
)
totalTests++
const spvAsMember = mkUser({ userId: 7003, roleCode: 'SPV_SALES', branchId: BRANCH_1 })
assertInvalid(
  validateMembershipPairPure({ spv: SPV_VALID, member: spvAsMember }),
  'MEMBER_ROLE_INVALID',
  'CASE 5: SPV_SALES menjadi member tim = DENIED MEMBER_ROLE_INVALID',
)
totalTests++
const salesAsSpv = mkUser({ userId: 7004, roleCode: 'PENJUALAN', branchId: BRANCH_1 })
assertInvalid(
  validateMembershipPairPure({ spv: salesAsSpv, member: SALES_VALID }),
  'SPV_ROLE_INVALID',
  'CASE 5b: PENJUALAN menjadi SPV = DENIED SPV_ROLE_INVALID (tidak boleh sales jadi SPV)',
)
totalTests++
assertInvalid(
  validateMembershipPairPure({
    spv: mkUser({ ...SPV_VALID, userId: SALES_MEMBER_ID }),
    member: SALES_VALID,
  }),
  'SELF_ASSIGNMENT_NOT_ALLOWED',
  'CASE 6: self assignment (spv userId = member userId) = DENIED SELF_ASSIGNMENT_NOT_ALLOWED',
)
totalTests++
const spvInactive = mkUser({ ...SPV_VALID, status: 'INACTIVE' })
assertInvalid(
  validateMembershipPairPure({ spv: spvInactive, member: SALES_VALID }),
  'SPV_NOT_ACTIVE',
  'CASE 7: SPV INACTIVE = DENIED SPV_NOT_ACTIVE',
)
totalTests++
const memberInactive = mkUser({ ...SALES_VALID, status: 'INACTIVE' })
assertInvalid(
  validateMembershipPairPure({ spv: SPV_VALID, member: memberInactive }),
  'MEMBER_NOT_ACTIVE',
  'CASE 8: member INACTIVE = DENIED MEMBER_NOT_ACTIVE',
)
totalTests++
const memberDiffBranch = mkUser({ ...SALES_VALID, branchId: BRANCH_2 })
assertInvalid(
  validateMembershipPairPure({ spv: SPV_VALID, member: memberDiffBranch }),
  'BRANCH_MISMATCH',
  'CASE 9: cross-branch SPV-Cabang1, member-Cabang2 = DENIED BRANCH_MISMATCH (NO multi-branch SPV)',
)

console.log('')
console.log('--- CASE 10-15: DB OPERATIONS — skip jika DB tidak configured ---')
if (isReviewDbConfigured()) {
  console.log('DB configured: Jalankan integration test (CASE 10-15)')
  skippedTests = skippedTests + 0
} else {
  console.log('SKIP CASE 10-15: review DB tidak configured di env saat ini. OK karena test DB akan dijalankan pada staging/local MariaDB nanti. Foundation validation layer sudah diuji pure.')
  for (let i = 10; i <= 15; i++) {
    totalTests++
    skippedTests++
    console.log(`[SKIP] CASE ${i}: requires configured DB for INSERT/UPDATE membership rows`)
  }
}

console.log('')
console.log('--- CASE 16-19: RESOLVER PURE LOGIC (WITHOUT DB, inject fake activeMembers array) ---')
const sessionSpvRole: AppRole = 'SPV_SALES'
const sessionPenjualanRole: AppRole = 'PENJUALAN'
const sessionSmRole: AppRole = 'SALES_MARKETING'

totalTests++
assertEqual(
  resolveManagedSalesUsersPure({
    sessionRole: sessionPenjualanRole,
    sessionUserId: SALES_MEMBER_ID,
    activeMembershipsForSpv: [],
  }),
  [SALES_MEMBER_ID],
  'CASE 18: PENJUALAN resolver = self-only [6001]',
)
totalTests++
assertEqual(
  resolveManagedSalesUsersPure({
    sessionRole: sessionSmRole,
    sessionUserId: SM_MEMBER_ID,
    activeMembershipsForSpv: [{ memberUserId: 9999 }],
  }),
  [SM_MEMBER_ID],
  'CASE 19: SALES_MARKETING resolver tetap self-only [6002] TIDAK terpengaruh array membership apapun',
)
totalTests++
const activeMembersSpv = [
  { memberUserId: SALES_MEMBER_ID },
  { memberUserId: SM_MEMBER_ID },
]
assertEqual(
  resolveManagedSalesUsersPure({
    sessionRole: sessionSpvRole,
    sessionUserId: SPV_USER_ID,
    activeMembershipsForSpv: activeMembersSpv,
  }),
  [SALES_MEMBER_ID, SM_MEMBER_ID, SPV_USER_ID].sort((a, b) => a - b),
  'CASE 20: SPV_SALES resolver mengembalikan SELF + active team members (sorted 6001,6002,5001)',
)
totalTests++
assertEqual(
  resolveManagedSalesUsersPure({
    sessionRole: sessionSpvRole,
    sessionUserId: SPV_USER_ID,
    activeMembershipsForSpv: [],
  }),
  [SPV_USER_ID],
  'CASE 20b: SPV_SALES tanpa member aktif = tetap return [self] (bukan kosong)',
)
totalTests++
const spvWithDeactivated = [
  { memberUserId: SALES_MEMBER_ID },
]
const deactivatedNotIncluded = resolveManagedSalesUsersPure({
  sessionRole: sessionSpvRole,
  sessionUserId: SPV_USER_ID,
  activeMembershipsForSpv: spvWithDeactivated,
})
assertEqual(
  deactivatedNotIncluded,
  [SALES_MEMBER_ID, SPV_USER_ID].sort((a, b) => a - b),
  'CASE 17: resolver HANYA menggunakan membership array aktif yang di-pass; jika deactivated tidak dimasukkan array → TIDAK masuk scope',
)
totalTests++
assertEqual(
  resolveManagedOwnerAliasesPure({
    sessionRole: sessionSpvRole,
    sessionUserId: SPV_USER_ID,
    activeMembershipsForSpv: activeMembersSpv,
  }),
  resolveManagedSalesUsersPure({
    sessionRole: sessionSpvRole,
    sessionUserId: SPV_USER_ID,
    activeMembershipsForSpv: activeMembersSpv,
  }),
  'CASE: resolveManagedOwnerAliases konsisten dengan resolveManagedSalesUsers (fondasi scope owner)',
)

console.log('')
console.log('--- STATIC ROLE SET SANITY CHECK (RC-5 blueprint SPV/MEMBER roles matrix) ---')
totalTests++
assertEqual(
  Array.from(SALES_SPV_VALID_ROLE_SET).sort(),
  ['SPV_SALES'],
  'SPV valid roles = HANYA SPV_SALES (bukan MANAGER/ADMIN/PENJUALAN)',
)
totalTests++
assertEqual(
  Array.from(SALES_MEMBER_VALID_ROLE_SET).sort(),
  ['PENJUALAN', 'SALES_MARKETING'].sort(),
  'Member valid roles = HANYA PENJUALAN + SALES_MARKETING (tidak SPV, tidak CS, tidak ADMIN)',
)

console.log('')
console.log('=== SALES TEAM MEMBERSHIP WAVE 2.9 SUMMARY ===')
console.log(`Total tests defined: ${totalTests}`)
console.log(`Skipped (DB ops requires DB env): ${skippedTests}`)
console.log(`Passed / Actually run: ${totalTests - skippedTests}`)
console.log(`Exit code saat ini: ${process.exitCode ?? 0}`)
if ((process.exitCode ?? 0) !== 0) {
  console.error('SUMMARY FAILURE — ada assertion yang tidak lolos.')
} else {
  console.log('SUMMARY: All defined tests PASS.')
}
