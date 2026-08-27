import assert from 'node:assert/strict'
import { mockTrackingWorkOrderAssignments, mockTrackingWorkOrders } from '@/lib/mock-tracking'
import { buildFieldTechWorkOrderOwnershipWhere } from '@/lib/q3-field-tech-ownership'
import type { AppSession } from '@/lib/auth-session'
import {
  acceptServiceWorkOrderAssignmentMock,
  releaseServiceWorkOrderAssignmentMock,
  reassignServiceWorkOrderAssignmentMock,
} from '@/lib/services/tracking-service'

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

function ensureMockTechAuthRepo() {
  const repo = globalThis as unknown as {
    __p52MockUsers?: {
      id: number
      status: string
      roleCode: string
    }[]
  }
  if (!repo.__p52MockUsers) {
    repo.__p52MockUsers = []
  }
  for (const uid of [211, 212]) {
    if (!repo.__p52MockUsers.some((u) => Number(u.id) === uid)) {
      repo.__p52MockUsers.push({ id: uid, status: 'ACTIVE', roleCode: 'TEKNISI' })
    }
  }
}

async function runAllAcceptTests() {
  let pass = 0
  let fail = 0
  const errors: string[] = []

  async function test(tag: string, name: string, fn: () => Promise<void>) {
    try {
      restoreAssignments()
      ensureMockTechAuthRepo()
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

  await test('T1', 'FIELD TECH 212 accepts own ASSIGNED 9002 → status ACCEPTED', async () => {
    const before = findAssignment(9002)
    assert.ok(before, '9002 exists')
    assert.equal(before.assignmentStatus, 'ASSIGNED')
    assert.equal(Number(before.assignedUserId), 212)

    const res = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: userFT212.userId, role: userFT212.role },
    })
    assert.equal(res.affectedRows, 1, 'affectedRows=1')
    assert.equal(res.accepted, true, 'accepted true')
    assert.equal(res.alreadyAccepted, false, 'first time NOT already')

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'ACCEPTED', 'status ACCEPTED')
    assert.equal(Number(after.assignedUserId), 212, 'assignedUserId preserved')
  })

  await test('T2', 'accepted_at is populated after accept 9002', async () => {
    const before = findAssignment(9002)
    assert.ok(before && before.acceptedAt == null, 'before acceptedAt NULL')

    await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: 212, role: 'FIELD_TECHNICIAN' },
    })

    const after = findAssignment(9002)!
    assert.notEqual(after.acceptedAt, null, 'acceptedAt NOT null setelah accept')
    assert.ok(
      typeof after.acceptedAt === 'string' && after.acceptedAt.length >= 10,
      'acceptedAt merupakan string tanggal yang valid',
    )
  })

  await test('T3', 'accepted_by_user_id is populated = session.userId after accept', async () => {
    const res = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: 212, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(res.affectedRows, 1)

    const after = findAssignment(9002)!
    const acceptedByVal = (after as unknown as { acceptedByUserId?: number | null }).acceptedByUserId
    assert.ok(acceptedByVal != null, 'acceptedByUserId tidak null')
    assert.equal(Number(acceptedByVal), 212, 'acceptedByUserId === 212 session.userId')
  })

  await test('T4', 'FIELD TECH 211 cannot accept TECH 212 ASSIGNED 9002 → DENY 0 rows', async () => {
    const res = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: userFT211.userId, role: userFT211.role },
    })
    assert.equal(res.affectedRows, 0, 'affectedRows 0 SELF_ONLY ditolak')
    assert.equal(res.accepted, false)

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'ASSIGNED', 'status tetap ASSIGNED tidak diubah')
    assert.equal(after.acceptedAt, null, 'acceptedAt tetap NULL')
  })

  await test('T5', 'non-FIELD_TECHNICIAN (SUPER_ADMIN) cannot ACCEPT assignment → DENY', async () => {
    const res = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: userAdmin4.userId, role: userAdmin4.role },
    })
    assert.equal(res.affectedRows, 0, 'SUPER_ADMIN role DENY accept → 0 rows')
    assert.equal(res.accepted, false)

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'ASSIGNED', 'status tetap ASSIGNED')
  })

  await test('T6', 'duplicate ACCEPT on ACCEPTED 9001 → idempotent NO-OP alreadyAccepted=true, timestamp preserved', async () => {
    const before = findAssignment(9001)
    assert.ok(before && before.assignmentStatus === 'ACCEPTED', '9001 awal ACCEPTED (existing mock)')
    const firstAcceptedAt = before.acceptedAt
    assert.ok(firstAcceptedAt != null, 'acceptedAt awal sudah terisi (mock existing)')

    const res = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9001,
      session: { userId: 211, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(res.affectedRows, 1, 'idempotent success → affectedRows 1')
    assert.equal(res.accepted, true)
    assert.equal(res.alreadyAccepted, true, 'alreadyAccepted === true idempotent')

    const after = findAssignment(9001)!
    assert.equal(after.assignmentStatus, 'ACCEPTED')
    assert.equal(after.acceptedAt, firstAcceptedAt, 'acceptedAt TIDAK di overwrite pada duplicate accept')
  })

  await test('T7', 'RELEASED assignment cannot be ACCEPTED → DENY, status remains RELEASED, no resurrection', async () => {
    const target = findAssignment(9002)!
    target.assignmentStatus = 'RELEASED'
    target.releasedAt = '2026-08-25 15:00:00'
    target.acceptedAt = null
    mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...JSON.parse(JSON.stringify(mockTrackingWorkOrderAssignments)))

    const res = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: 212, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(res.affectedRows, 0, 'RELEASED → accept 0 rows DENY resurrection')
    assert.equal(res.accepted, false)
    assert.equal(res.alreadyAccepted, false)

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'RELEASED', 'status tetap RELEASED tidak kembali active')
    assert.equal(after.releasedAt, '2026-08-25 15:00:00', 'releasedAt tidak berubah')
    assert.equal(after.acceptedAt, null, 'acceptedAt tetap NULL tidak di-set')
  })

  await test('T8', 'ACCEPTED status tetap memenuhi Q3 active ownership predicate (tidak revoke)', async () => {
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
      return mockTrackingWorkOrders.some((wo) => {
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

    const beforeAccept = qualify(212)
    assert.ok(beforeAccept, 'before accept user 212 qualify own 9002 ASSIGNED → yes')

    await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: 212, role: 'FIELD_TECHNICIAN' },
    })
    const afterAccept = qualify(212)
    assert.equal(afterAccept, true, 'AFTER accept user 212 TETAP qualify → ACCEPTED tetap Q3 active tidak revoke')
  })

  await test('T9', 'after ACCEPT 9002 → P5.1 RELEASE remains valid (interop P5.1 unchanged)', async () => {
    const acceptRes = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      session: { userId: 212, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(acceptRes.accepted, true, 'accept dulu sukses')
    assert.equal(findAssignment(9002)?.assignmentStatus, 'ACCEPTED')

    const releaseRes = await releaseServiceWorkOrderAssignmentMock({
      assignmentId: 9002,
      sessionUserId: 212,
      releasedByUserId: 212,
    })
    assert.equal(releaseRes.affectedRows, 1, 'P5.1 release terhadap ACCEPTED sukses → interop valid')

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'RELEASED')
    assert.notEqual(after.releasedAt, null)
  })

  await test('T10', 'after ACCEPT 9001 → P5.2 REASSIGN remains valid (interop P5.2 unchanged)', async () => {
    const acceptRes = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: 9001,
      session: { userId: 211, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(acceptRes.accepted, true, 'accept 9001 alreadyAccepted')
    assert.equal(findAssignment(9001)?.assignmentStatus, 'ACCEPTED')

    const reassignRes = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session: { userId: 211, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(reassignRes.affectedRows, 1, 'P5.2 reassign terhadap ACCEPTED TECH_A sukses')
    assert.equal(reassignRes.alreadyDone, false)

    const afterA = findAssignment(9001)!
    assert.equal(afterA.assignmentStatus, 'RELEASED', 'TECH_A 9001 released')
  })

  await test('T11', 'TECH_B created by P5.2 reassign starts ASSIGNED → dapat di-ACCEPT secara mandiri oleh TECH_B', async () => {
    const first = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session: { userId: 211, role: 'FIELD_TECHNICIAN' },
    })
    assert.ok(first.newAssignmentId, 'TECH_B new assignment id muncul')
    const techBId = Number(first.newAssignmentId)
    const techBRow = findAssignment(techBId)
    assert.ok(techBRow, 'TECH_B assignment exists')
    assert.equal(techBRow.assignmentStatus, 'ASSIGNED', 'TECH_B default ASSIGNED bukan ACCEPTED')
    assert.equal(Number(techBRow.assignedUserId), 212, 'TECH_B user 212')
    assert.equal(techBRow.acceptedAt, null, 'TECH_B acceptedAt awal NULL')

    const acceptRes = await acceptServiceWorkOrderAssignmentMock({
      assignmentId: techBId,
      session: { userId: 212, role: 'FIELD_TECHNICIAN' },
    })
    assert.equal(acceptRes.accepted, true, 'TECH_B 212 accept ASSIGNED sukses')
    assert.equal(acceptRes.alreadyAccepted, false)

    const afterTechB = findAssignment(techBId)!
    assert.equal(afterTechB.assignmentStatus, 'ACCEPTED', 'TECH_B status ACCEPTED')
    assert.notEqual(afterTechB.acceptedAt, null, 'TECH_B acceptedAt terisi')
  })

  await test('T12', 'concurrent/double ACCEPT promise tidak corrupt state; final ACCEPTED; timestamp tidak berubah ganda', async () => {
    const pAll = await Promise.all([
      acceptServiceWorkOrderAssignmentMock({
        assignmentId: 9002,
        session: { userId: 212, role: 'FIELD_TECHNICIAN' },
      }),
      acceptServiceWorkOrderAssignmentMock({
        assignmentId: 9002,
        session: { userId: 212, role: 'FIELD_TECHNICIAN' },
      }),
    ])
    const firstAccepted = pAll[0].accepted && pAll[0].alreadyAccepted === false
    const secondIdem = pAll[1].accepted && pAll[1].alreadyAccepted === true
    assert.ok(
      (firstAccepted && secondIdem) || (pAll[1].accepted && !pAll[1].alreadyAccepted && pAll[0].alreadyAccepted),
      'satu mutation sukses, satu lagi idempotent; tidak ada double corrupt',
    )

    const after = findAssignment(9002)!
    assert.equal(after.assignmentStatus, 'ACCEPTED', 'final status ACCEPTED tepat')
    assert.ok(after.acceptedAt != null, 'acceptedAt ada')
    const byUid = Number((after as unknown as { acceptedByUserId?: number | null }).acceptedByUserId ?? 0)
    assert.equal(byUid, 212, 'acceptedByUserId == 212')
  })

  process.stdout.write(`\nP5.3 Accept tests result: ${pass}/12 PASS, ${fail} FAIL\n`)
  if (fail > 0) {
    process.stdout.write(`Errors:\n${errors.join('\n')}\n`)
    process.exit(1)
  } else {
    process.exit(0)
  }
}

void runAllAcceptTests()
