import assert from 'node:assert/strict'
import type { AppSession } from '@/lib/auth-session'
import {
  Q3_ASSIGNMENT_ACTIVE_STATUSES,
  Q3_ASSIGNMENT_ROLE_CANONICAL,
  buildFieldTechWorkOrderOwnershipWhere,
  isQ3OwnershipEnforcedForSession,
} from '@/lib/q3-field-tech-ownership'

type PartialSession = Partial<Pick<AppSession, 'userId'>> & Pick<AppSession, 'username' | 'displayName' | 'role' | 'branchId' | 'branchIds'>

function makeSession(overrides: Partial<PartialSession> & { role: AppSession['role'] }): AppSession {
  return {
    userId: overrides.userId ?? 999,
    username: overrides.username ?? 'default.user',
    displayName: overrides.displayName ?? 'Default User',
    role: overrides.role,
    branchId: overrides.branchId ?? null,
    branchIds: overrides.branchIds ?? [],
  }
}

function predicateContainsUsernameStringLiteral(pred: { whereFragment: string; values: unknown[] }): boolean {
  if (pred.whereFragment.includes('username') || pred.whereFragment.includes('displayName') || pred.whereFragment.includes('picUsername')) {
    return true
  }
  for (const v of pred.values) {
    if (typeof v === 'string' && /[a-z]+\.[a-z]+/i.test(v) && Number.isNaN(Number(v))) {
      return true
    }
  }
  return false
}

async function test1PicMatchAllow() {
  const session = makeSession({ role: 'FIELD_TECHNICIAN', userId: 211, username: 'teknisi.trouble01', displayName: 'Teknisi 1' })
  const pred = buildFieldTechWorkOrderOwnershipWhere(session, 'wo')
  assert.equal(pred.enforced, true, 'T1 enforce must true')
  assert.equal(pred.enforcementMode, 'FIELD_TECH_ENFORCED', 'T1 mode FIELD_TECH_ENFORCED')
  assert.ok(pred.whereFragment.includes('current_pic_user_id = ?'), 'T1 where includes PIC clause')
  assert.ok(pred.whereFragment.includes('EXISTS'), 'T1 where EXISTS assignment')
  assert.equal(pred.values.length, 2 + 1 + Q3_ASSIGNMENT_ACTIVE_STATUSES.length, 'T1 param count = userId(PIC) + userId(assigned) + role + active statuses')
  assert.equal(pred.values[0], 211, 'T1 pic userId = 211')
  assert.equal(pred.values[1], 211, 'T1 assigned userId = 211')
}

async function test2AssignedAllow() {
  const session = makeSession({ role: 'FIELD_TECHNICIAN', userId: 212, username: 'teknisi.trouble02' })
  const pred = buildFieldTechWorkOrderOwnershipWhere(session, 'wo')
  assert.equal(pred.enforced, true, 'T2 enforced')
  assert.ok(pred.whereFragment.includes('q3_a.assigned_user_id = ?'), 'T2 assigned_user_id clause present')
  assert.equal(pred.values[1], 212, 'T2 assigned userId = 212 at index 1')
  const roleIndex = 2
  assert.equal(pred.values[roleIndex], Q3_ASSIGNMENT_ROLE_CANONICAL, 'T2 assignment role canonical')
  const activeAfter = 3
  for (let i = 0; i < Q3_ASSIGNMENT_ACTIVE_STATUSES.length; i++) {
    assert.equal(pred.values[activeAfter + i], Q3_ASSIGNMENT_ACTIVE_STATUSES[i], `T2 status[${i}] = ${Q3_ASSIGNMENT_ACTIVE_STATUSES[i]}`)
  }
  assert.ok(pred.whereFragment.includes('released_at IS NULL'), 'T2 released_at IS NULL present')
}

async function test3OtherUserPicAndAssignDeny() {
  const currentSession = makeSession({ role: 'FIELD_TECHNICIAN', userId: 9999 })
  const pred = buildFieldTechWorkOrderOwnershipWhere(currentSession)
  assert.equal(pred.enforced, true)
  const picUserIdInValues = pred.values.filter((v: unknown) => typeof v === 'number' && v === 9999).length
  assert.equal(picUserIdInValues, 2, 'T3 pred hanya mengandung userId session sendiri (PIC dan ASSIGNED), tidak ada hardcode user lain')
  assert.ok(!pred.whereFragment.includes('IN (211,'), 'T3 tidak ada hardcode tech 211')
}

async function test4AssignmentStatusReleasedDeny() {
  const session = makeSession({ role: 'FIELD_TECHNICIAN', userId: 211 })
  const pred = buildFieldTechWorkOrderOwnershipWhere(session)
  assert.ok(!pred.whereFragment.includes("'RELEASED'"), 'T4 RELEASED TIDAK ADA dalam IN clause status active')
  assert.ok(!pred.values.includes('RELEASED'), 'T4 nilai RELEASED tidak ada di bind params')
  for (const s of pred.activeStatuses) {
    assert.notEqual(s, 'RELEASED', `T4 status active bukan RELEASED: ${s}`)
  }
  assert.ok(pred.whereFragment.includes('released_at IS NULL'), 'T4 active dijamin dengan released_at IS NULL predicate')
}

async function test5ReleasedAtNotNullInPredicateDeny() {
  const session = makeSession({ role: 'FIELD_TECHNICIAN', userId: 211 })
  const pred = buildFieldTechWorkOrderOwnershipWhere(session)
  assert.ok(pred.whereFragment.includes('released_at IS NULL'), 'T5 wajib ada released_at IS NULL')
  assert.ok(!pred.whereFragment.includes('released_at IS NOT NULL'), 'T5 tidak pernah izinkan NOT NULL')
  assert.ok(!pred.whereFragment.includes('COALESCE(q3_a.released_at'), 'T5 tidak ada exception untuk released_at')
}

async function test6MineFalseStillEnforce() {
  const session = makeSession({ role: 'FIELD_TECHNICIAN', userId: 300 })
  const mineTrue = buildFieldTechWorkOrderOwnershipWhere(session)
  const mineFalseSession = session
  const mineFalse = buildFieldTechWorkOrderOwnershipWhere(mineFalseSession)
  assert.equal(mineTrue.enforced, true, 'T6 enforced true mine=true simulated')
  assert.equal(mineFalse.enforced, true, 'T6 enforced true mine=false (predicate tidak peduli mine, tidak menerima mine param)')
  assert.equal(mineFalse.whereFragment, mineTrue.whereFragment, 'T6 fragment identik tanpa melihat mine')
  assert.deepEqual(mineFalse.values, mineTrue.values, 'T6 bind values identik tanpa melihat mine')
}

async function test7MineOmittedStillEnforce() {
  const session = makeSession({ role: 'FIELD_TECHNICIAN', userId: 777 })
  const result = buildFieldTechWorkOrderOwnershipWhere(session)
  assert.equal(result.enforced, true, 'T7 omitted mine = enforced')
  assert.ok(result.whereFragment.length > 0, 'T7 where fragment non-empty')
  assert.equal(result.values[0], 777, 'T7 pic userId match')
  const hasNeitherMineParam = !result.whereFragment.includes('mine')
  assert.ok(hasNeitherMineParam, 'T7 fragment tidak menyebut mine sama sekali')
}

async function test8UsernameDiffUserIdSameAllow() {
  const sessionA = makeSession({ role: 'FIELD_TECHNICIAN', userId: 500, username: 'alpha.tech', displayName: 'Alpha' })
  const sessionB = makeSession({ role: 'FIELD_TECHNICIAN', userId: 500, username: 'beta.tech.diff', displayName: 'Beta Diff' })
  const predA = buildFieldTechWorkOrderOwnershipWhere(sessionA)
  const predB = buildFieldTechWorkOrderOwnershipWhere(sessionB)
  assert.equal(predA.whereFragment, predB.whereFragment, 'T8 where identik')
  assert.deepEqual(predA.values, predB.values, 'T8 values identik hanya userId')
  assert.equal(predA.values[0], 500, 'T8 A userId 500')
  assert.equal(predB.values[0], 500, 'T8 B userId 500')
  assert.ok(!predicateContainsUsernameStringLiteral(predA), 'T8 predikat A tidak memiliki string username apapun di fragment/values')
  assert.ok(!predicateContainsUsernameStringLiteral(predB), 'T8 predikat B TIDAK ADA string username di fragment/values (identity pure numeric userId)')
}

async function test9UsernameSameUserIdDiffDeny() {
  const sessionReal = makeSession({ role: 'FIELD_TECHNICIAN', userId: 111, username: 'collision.tech' })
  const sessionHacker = makeSession({ role: 'FIELD_TECHNICIAN', userId: 999, username: 'collision.tech' })
  const predReal = buildFieldTechWorkOrderOwnershipWhere(sessionReal)
  const predHacker = buildFieldTechWorkOrderOwnershipWhere(sessionHacker)
  assert.notDeepEqual(predReal.values, predHacker.values, 'T9 values BERBEDA karena userId beda walaupun username sama')
  assert.equal(predReal.values[0], 111, 'T9 real userId 111')
  assert.equal(predHacker.values[0], 999, 'T9 hacker userId 999')
  assert.ok(!predicateContainsUsernameStringLiteral(predHacker), 'T9 tidak ada string username collision di values/fragment (identity numeric userId ONLY)')
}

async function test10NonFieldTechUnchanged() {
  const roles: Array<AppSession['role']> = ['SUPER_ADMIN', 'NOC_OPERATOR', 'ADMIN', 'OWNER', 'FINANCE', 'HR', 'GA', 'PENJUALAN', 'SALES_MARKETING', 'CS_OPERATOR', 'CS_ADMIN', 'TT_OPERATOR', 'DIGITAL_CREATOR', 'DISMANTLE_OPERATOR']
  for (const role of roles) {
    const s = makeSession({ role, userId: 1 })
    const pred = buildFieldTechWorkOrderOwnershipWhere(s)
    assert.equal(pred.enforced, false, `T10 role ${role} enforced false`)
    assert.equal(pred.whereFragment, '', `T10 role ${role} where empty no-op`)
    assert.deepEqual(pred.values, [], `T10 role ${role} values empty`)
    assert.equal(pred.enforcementMode, 'OTHER_ROLE_NOOP', `T10 mode OTHER_ROLE_NOOP for ${role}`)
    const shouldEnforce = isQ3OwnershipEnforcedForSession(s)
    assert.equal(shouldEnforce, false, `T10 isQ3Enforced session role ${role} false`)
  }
  const shouldEnforceFieldTech = isQ3OwnershipEnforcedForSession(makeSession({ role: 'FIELD_TECHNICIAN', userId: 1 }))
  assert.equal(shouldEnforceFieldTech, true, 'T10 FIELD TECH enforced flag true')

  const invalidUndefinedUserIdSession = {
    username: 'tech.missing.id',
    displayName: 'Tech No ID',
    role: 'FIELD_TECHNICIAN' as const,
    branchId: null,
    branchIds: [],
  } satisfies AppSession
  const predInvalidUndef = buildFieldTechWorkOrderOwnershipWhere(invalidUndefinedUserIdSession)
  assert.equal(predInvalidUndef.enforced, true, 'T10 undefined userId tetap enforced FAIL CLOSED')
  assert.equal(predInvalidUndef.whereFragment, '1 = 0', 'T10 undefined userId where 1=0 FAIL CLOSED deny all')
  assert.equal(predInvalidUndef.enforcementMode, 'FIELD_TECH_FAIL_CLOSED_INVALID_USERID', 'T10 mode FAIL CLOSED for undefined')

  const invalidZeroSession = makeSession({ role: 'FIELD_TECHNICIAN' })
  invalidZeroSession.userId = 0
  const predInvalidZero = buildFieldTechWorkOrderOwnershipWhere(invalidZeroSession)
  assert.equal(predInvalidZero.whereFragment, '1 = 0', 'T10 userId=0 FAIL CLOSED')

  const invalidNegativeSession = makeSession({ role: 'FIELD_TECHNICIAN' })
  invalidNegativeSession.userId = -5
  const predInvalidNeg = buildFieldTechWorkOrderOwnershipWhere(invalidNegativeSession)
  assert.equal(predInvalidNeg.enforcementMode, 'FIELD_TECH_FAIL_CLOSED_INVALID_USERID', 'T10 negative userId FAIL CLOSED mode')
  assert.equal(predInvalidNeg.values.length, 0, 'T10 invalid userId zero bind values')
}

async function main() {
  await test1PicMatchAllow()
  await test2AssignedAllow()
  await test3OtherUserPicAndAssignDeny()
  await test4AssignmentStatusReleasedDeny()
  await test5ReleasedAtNotNullInPredicateDeny()
  await test6MineFalseStillEnforce()
  await test7MineOmittedStillEnforce()
  await test8UsernameDiffUserIdSameAllow()
  await test9UsernameSameUserIdDiffDeny()
  await test10NonFieldTechUnchanged()
  console.log(`Q3 P1 ownership predicate tests: ALL 10 PASSED`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
