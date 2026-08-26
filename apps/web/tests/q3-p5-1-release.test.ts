import assert from 'node:assert/strict'
import { mockTrackingWorkOrderAssignments, mockTrackingWorkOrders } from '@/lib/mock-tracking'
import { buildFieldTechWorkOrderOwnershipWhere } from '@/lib/q3-field-tech-ownership'
import type { AppSession } from '@/lib/auth-session'
import { releaseServiceWorkOrderAssignmentMock } from '@/lib/services/tracking-service'

type MockAssignment = (typeof mockTrackingWorkOrderAssignments)[number]

const originalAssignments: MockAssignment[] = JSON.parse(JSON.stringify(mockTrackingWorkOrderAssignments)) as MockAssignment[]

function restoreAssignments() {
  const freshClone = JSON.parse(JSON.stringify(originalAssignments)) as MockAssignment[]
  mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...freshClone)
}

function findAssignment(id: number): MockAssignment | undefined {
  return mockTrackingWorkOrderAssignments.find((row) => Number(row.id ?? 0) === id)
}

const userFT211: AppSession = {
  userId: 211,
  username: 'teknisi.trouble01',
  displayName: 'Teknisi Trouble 01',
  role: 'FIELD_TECHNICIAN',
  branchId: 1,
  branchIds: [1],
}

const userFT212: AppSession = {
  userId: 212,
  username: 'teknisi.psb01',
  displayName: 'Teknisi PSB 01',
  role: 'FIELD_TECHNICIAN',
  branchId: 1,
  branchIds: [1],
}

const userAdmin4: AppSession = {
  userId: 4,
  username: 'admin.perkasa',
  displayName: 'Super Admin',
  role: 'SUPER_ADMIN',
  branchId: 1,
  branchIds: [1],
}

async function runAllReleaseTests() {
  let pass = 0
  let fail = 0
  const errors: string[] = []

  async function test(tag: string, name: string, fn: () => Promise<void>) {
    try {
      restoreAssignments()
      await fn()
      pass += 1
      process.stdout.write(`  PASS ${tag} — ${name}\n`)
    } catch (err) {
      fail += 1
      errors.push(`${tag} FAIL: ${err instanceof Error ? err.message : String(err)}`)
      process.stdout.write(`  FAIL ${tag} — ${name}\n       ${err instanceof Error ? err.message.split('\n').join('\n       ') : String(err)}\n`)
    } finally {
      restoreAssignments()
    }
  }

  await test('T1', 'FIELD TECH 212 release ASSIGNED 9002 → RELEASED + releasedAt set', async () => {
    const before = findAssignment(9002)
    assert.ok(before, '9002 exists')
    assert.equal(before.assignmentStatus, 'ASSIGNED')
    assert.equal(before.releasedAt, null)
    assert.equal(Number(before.assignedUserId), 212)

    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9002, sessionUserId: userFT212.userId })
    assert.equal(res.affectedRows, 1, 'affectedRows=1')

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'RELEASED', 'status RELEASED')
    assert.notEqual(after.releasedAt, null, 'releasedAt NOT null')
    assert.equal(Number(after.assignedUserId), 212, 'assignedUserId tidak berubah')
  })

  await test('T2', 'FIELD TECH 211 release ACCEPTED 9001 → RELEASED + releasedAt set', async () => {
    const before = findAssignment(9001)
    assert.ok(before)
    assert.equal(before.assignmentStatus, 'ACCEPTED')
    assert.equal(before.releasedAt, null)

    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: 211 })
    assert.equal(res.affectedRows, 1)

    const after = findAssignment(9001)!
    assert.equal(after.assignmentStatus, 'RELEASED')
    assert.notEqual(after.releasedAt, null)
    assert.ok(after.acceptedAt != null, 'acceptedAt audit trail tetap disimpan tidak di NULLkan')
  })

  await test('T3', 'unauthorized TECH 212 release 211 assignment 9001 → DENY 0 rows', async () => {
    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: 212 })
    assert.equal(res.affectedRows, 0, 'affectedRows 0 not owner')

    const after = findAssignment(9001)!
    assert.equal(after.assignmentStatus, 'ACCEPTED')
    assert.equal(after.releasedAt, null)
  })

  await test('T4', 'already released → second call NOOP 0 rows, status tetap RELEASED, timestamp preserved', async () => {
    const r1 = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9002, sessionUserId: 212 })
    assert.equal(r1.affectedRows, 1, 'first release success 1')
    const firstAfter = findAssignment(9002)!
    const firstTs = firstAfter.releasedAt
    assert.notEqual(firstTs, null)

    const r2 = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9002, sessionUserId: 212 })
    assert.equal(r2.affectedRows, 0, 'second release NOOP 0')

    const secondAfter = findAssignment(9002)!
    assert.equal(secondAfter.assignmentStatus, 'RELEASED', 'status stays RELEASED tidak kembali active')
    assert.equal(secondAfter.releasedAt, firstTs, 'releasedAt timestamp TIDAK di overwrite kedua kalinya')
  })

  await test('T5', 'releasedAt sudah non-null → tidak bisa release lagi 0 rows, timestamp lama tetap', async () => {
    const target = findAssignment(9001)!
    target.assignmentStatus = 'RELEASED'
    target.releasedAt = '2026-08-20 10:00:00'
    mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...JSON.parse(JSON.stringify(mockTrackingWorkOrderAssignments)))

    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: 211 })
    assert.equal(res.affectedRows, 0, 'releasedAt non null → 0 rows')
    const after = findAssignment(9001)!
    assert.equal(after.releasedAt, '2026-08-20 10:00:00', 'timestamp lama tidak berubah')
    assert.equal(after.assignmentStatus, 'RELEASED')
  })

  await test('T6', 'invalid session.userId undefined/null/0/NaN/negative → FAIL CLOSED 0 rows tanpa exception', async () => {
    const cases: Array<unknown> = [undefined, null, 0, -5, Number.NaN]
    for (const v of cases) {
      const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: v as number | undefined | null })
      assert.equal(res.affectedRows, 0, `case uid=${JSON.stringify(v)} → affectedRows 0 (fail closed)`)
    }
    const row = findAssignment(9001)!
    assert.equal(row.assignmentStatus, 'ACCEPTED')
    assert.equal(row.releasedAt, null)
  })

  await test('T7', 'username string (bukan numeric) tidak bisa authorize → NaN convert fail closed 0', async () => {
    const usernameAsParam = 'teknisi.trouble01' as unknown as number
    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: usernameAsParam })
    assert.equal(res.affectedRows, 0, 'username string jadi NaN → 0 rows. Username tidak bisa authorize.')
    const after = findAssignment(9001)!
    assert.equal(after.assignmentStatus, 'ACCEPTED')
  })

  await test('T8', 'active-state guard status tidak dalam ASSIGNED/ACCEPTED (misal ON_PROGRESS) → 0 rows tidak release', async () => {
    const target = findAssignment(9001)!
    target.assignmentStatus = 'ON_PROGRESS'
    target.releasedAt = null
    mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...JSON.parse(JSON.stringify(mockTrackingWorkOrderAssignments)))

    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: 211 })
    assert.equal(res.affectedRows, 0, 'status non-active → guard active state IN list = 0 rows denied')
    const after = findAssignment(9001)!
    assert.equal(after.assignmentStatus, 'ON_PROGRESS')
    assert.equal(after.releasedAt, null)
  })

  await test('T9', 'userId boundary numeric not match assigned (NOC 44 vs assigned 212 on id 9002) → deny 0', async () => {
    const res = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9002, sessionUserId: 44 })
    assert.equal(res.affectedRows, 0, '44 bukan assigned user id 212 → reject 0')
    const target = findAssignment(9002)!
    assert.equal(target.assignmentStatus, 'ASSIGNED')
    assert.equal(target.releasedAt, null)
  })

  await test('T10', 'concurrent double release tidak hasil state invalid, hanya 1 sukses maksimal', async () => {
    const pAll = await Promise.all([
      releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: 211 }),
      releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: 211 }),
    ])
    const successCount = (pAll[0].affectedRows === 1 ? 1 : 0) + (pAll[1].affectedRows === 1 ? 1 : 0)
    assert.ok(successCount <= 1, `maksimal 1 call sukses, actual ${successCount} — tidak double release`)
    const after = findAssignment(9001)!
    assert.equal(after.assignmentStatus, 'RELEASED')
    assert.notEqual(after.releasedAt, null)
  })

  await test('T11', 'released assignment tidak lagi memenuhi Q3 ownership semantics → revoke', async () => {
    const originalWO = JSON.parse(JSON.stringify(mockTrackingWorkOrders)) as typeof mockTrackingWorkOrders
    function qualify(userId: number): boolean {
      const session: AppSession = {
        userId,
        username: 'x',
        displayName: 'X',
        role: 'FIELD_TECHNICIAN',
        branchId: 1,
        branchIds: [1],
      }
      const pred = buildFieldTechWorkOrderOwnershipWhere(session, 'wo')
      if (!pred.enforced) return false
      const picVal = pred.values[0]
      const assignUid = pred.values[1]
      const roleVal = pred.values[2]
      const actives = pred.values.slice(3, 5) as Array<string>
      return originalWO.some((wo) => {
        const isPic = picVal != null && Number(wo.picUserId) === Number(picVal)
        if (isPic) return true
        return mockTrackingWorkOrderAssignments.some((a) =>
          Number(a.workOrderId) === Number(wo.id)
          && Number(a.assignedUserId) === Number(assignUid)
          && String(a.assignmentRole ?? '').trim().toUpperCase() === String(roleVal ?? '').trim().toUpperCase()
          && actives.includes(String(a.assignmentStatus ?? '').trim().toUpperCase())
          && a.releasedAt == null,
        )
      })
    }

    const before = qualify(212)
    assert.ok(before, 'before release user 212 qualify own 9002 → yes')

    await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9002, sessionUserId: 212 })
    const after = qualify(212)
    assert.equal(after, false, 'AFTER release user 212 TIDAK qualify → RELEASE revoke Q3 ownership')
  })

  await test('T12', 'non-FIELD_TECH role SUPER_ADMIN existing behavior unchanged, tidak bisa release bukan assigned user, helper P1 non-FT tetap return enforced false NOOP', async () => {
    const r = await releaseServiceWorkOrderAssignmentMock({ assignmentId: 9001, sessionUserId: userAdmin4.userId })
    assert.equal(r.affectedRows, 0, 'SUPER_ADMIN bukan owner assignment → 0 rows. Tidak ada permission admin bypass inventasi baru.')
    const row = findAssignment(9001)!
    assert.equal(row.assignmentStatus, 'ACCEPTED')
    assert.equal(row.releasedAt, null)
    const predNonFT = buildFieldTechWorkOrderOwnershipWhere(userAdmin4, 'wo')
    assert.equal(predNonFT.enforced, false, 'non-FT P1 helper enforced false NOOP fragment empty → existing behavior unchanged T12')
  })

  process.stdout.write(`\nP5.1 Release tests result: ${pass}/12 PASS, ${fail} FAIL\n`)
  if (fail > 0) {
    process.stdout.write(`Errors:\n${errors.join('\n')}\n`)
    process.exit(1)
  } else {
    process.exit(0)
  }
}

void runAllReleaseTests()
