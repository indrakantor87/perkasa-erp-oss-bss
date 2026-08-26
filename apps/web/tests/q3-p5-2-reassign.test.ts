import assert from 'node:assert/strict'
import { mockTrackingWorkOrderAssignments } from '@/lib/mock-tracking'
import { reassignServiceWorkOrderAssignmentMock } from '@/lib/services/tracking-service'
import type { AppSession } from '@/lib/auth-session'

type MockAssignment = (typeof mockTrackingWorkOrderAssignments)[number]
const originalAssignments: MockAssignment[] = JSON.parse(
  JSON.stringify(mockTrackingWorkOrderAssignments),
) as MockAssignment[]

function restoreAssignments() {
  const freshClone = JSON.parse(JSON.stringify(originalAssignments)) as MockAssignment[]
  mockTrackingWorkOrderAssignments.splice(0, mockTrackingWorkOrderAssignments.length, ...freshClone)
}

function setMockUsers(list: { id: number; status: string; roleCode: string }[]) {
  const g = globalThis as unknown as { __p52MockUsers?: typeof list }
  g.__p52MockUsers = list
}

function clearMockUsers() {
  const g = globalThis as unknown as { __p52MockUsers?: unknown }
  delete g.__p52MockUsers
}

function findAssignment(id: number) {
  return mockTrackingWorkOrderAssignments.find((row) => Number(row.id ?? 0) === id)
}

function findActiveAssignmentsForWO(workOrderId: number) {
  return mockTrackingWorkOrderAssignments.filter((rowRaw) => {
    const row = rowRaw as unknown as {
      workOrderId: number
      assignmentRole: string
      assignmentStatus: string
      releasedAt: unknown
    }
    const role = String(row.assignmentRole ?? '').trim().toUpperCase()
    const status = String(row.assignmentStatus ?? '').trim().toUpperCase()
    return (
      Number(row.workOrderId ?? 0) === workOrderId &&
      role === 'FIELD_TECHNICIAN' &&
      (status === 'ASSIGNED' || status === 'ACCEPTED') &&
      row.releasedAt == null
    )
  })
}

const sessions: Record<string, AppSession> = {
  ft211: {
    userId: 211,
    username: 'teknisi.trouble01',
    displayName: 'Teknisi Trouble 01',
    role: 'FIELD_TECHNICIAN',
    branchId: 1,
    branchIds: [1],
  },
  ft212: {
    userId: 212,
    username: 'teknisi.psb01',
    displayName: 'Teknisi PSB 01',
    role: 'FIELD_TECHNICIAN',
    branchId: 1,
    branchIds: [1],
  },
  admin4: {
    userId: 4,
    username: 'admin.perkasa',
    displayName: 'Super Admin',
    role: 'ADMIN',
    branchId: 1,
    branchIds: [1],
  },
  super2: {
    userId: 2,
    username: 'superadmin',
    displayName: 'Super Admin 2',
    role: 'SUPER_ADMIN',
    branchId: 1,
    branchIds: [1],
  },
  noc50: {
    userId: 50,
    username: 'noc.user',
    displayName: 'NOC User',
    role: 'NOC_OPERATOR',
    branchId: 1,
    branchIds: [1],
  },
  tt60: {
    userId: 60,
    username: 'tt.user',
    displayName: 'TT User',
    role: 'TT_OPERATOR',
    branchId: 1,
    branchIds: [1],
  },
  sales30: {
    userId: 30,
    username: 'sales.user',
    displayName: 'Sales 01',
    role: 'SALES_MARKETING',
    branchId: 1,
    branchIds: [1],
  },
  owner1: {
    userId: 1,
    username: 'owner',
    displayName: 'Owner',
    role: 'OWNER',
    branchId: 1,
    branchIds: [1],
  },
  finance70: {
    userId: 70,
    username: 'finance',
    displayName: 'Finance',
    role: 'FINANCE',
    branchId: 1,
    branchIds: [1],
  },
}

async function runAllP52Tests() {
  let pass = 0
  let fail = 0
  const errors: string[] = []

  async function test(tag: string, name: string, fn: () => Promise<void>) {
    try {
      restoreAssignments()
      clearMockUsers()
      await fn()
      pass += 1
      process.stdout.write(`  PASS ${tag} — ${name}\n`)
    } catch (err) {
      fail += 1
      errors.push(
        `${tag} FAIL: ${err instanceof Error ? err.message : String(err)}`,
      )
      process.stdout.write(
        `  FAIL ${tag} — ${name}\n       ${
          err instanceof Error
            ? err.message.split('\n').join('\n       ')
            : String(err)
        }\n`,
      )
    } finally {
      restoreAssignments()
      clearMockUsers()
    }
  }

  await test('T1', 'authorized FIELD_TECHNICIAN self reassign (WO 322 TECH_212 → TECH_211)', async () => {
    const session = sessions.ft212
    const before = findAssignment(9002)
    assert.ok(before)
    assert.equal(Number(before.assignedUserId), 212)
    assert.equal(before.releasedAt, null)
    const beforePrimary = Number((before as unknown as { isPrimary: number }).isPrimary)
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 211,
      session,
    })
    assert.equal(res.affectedRows, 1, 'affectedRows 1')
    assert.equal(res.alreadyDone, false)
    assert.ok(res.newAssignmentId && res.newAssignmentId > 0, 'newAssignmentId > 0')
    const after9002 = findAssignment(9002)!
    assert.equal(after9002.assignmentStatus, 'RELEASED')
    assert.notEqual(after9002.releasedAt, null, '9002 releasedAt NOT null')
    const primaryAfter = Number(
      (after9002 as unknown as { isPrimary: number }).isPrimary,
    )
    assert.equal(
      primaryAfter,
      beforePrimary,
      'is_primary TECH_A released TETAP sesuai nilai aslinya (TIDAK DIUBAH)',
    )
    const active = findActiveAssignmentsForWO(322)
    assert.equal(active.length, 1, 'maks 1 active TECH per WO 322 setelah reassign')
    const onlyActive = active[0] as unknown as {
      id: number
      assignedUserId: number
      isPrimary: number
    }
    assert.equal(Number(onlyActive.assignedUserId), 211, 'TECH_B = 211 active baru')
    assert.equal(Number(onlyActive.isPrimary), 1, 'TECH_B baru is_primary = 1')
  })

  await test(
    'T2',
    'unauthorized FIELD_TECHNICIAN 212 reassign TECH_A 9001 milik 211 (bukan TECH_A sendiri) → DENY affectedRows 0',
    async () => {
      const session = sessions.ft212
      const before9001 = findAssignment(9001)!
      assert.equal(Number(before9001.assignedUserId), 211)
      const res = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: 9001,
        targetTechBId: 212,
        session,
      })
      assert.equal(res.affectedRows, 0, 'affectedRows 0')
      const after9001 = findAssignment(9001)!
      assert.notEqual(after9001.assignmentStatus, 'RELEASED', '9001 TIDAK released')
      assert.equal(after9001.releasedAt, null, 'releasedAt tetap null')
      const active321 = findActiveAssignmentsForWO(321)
      assert.equal(active321.length, 1, 'active WO 321 tetap 1 TECH (tidak berubah)')
    },
  )

  await test('T3', 'ADMIN full access reassign siapapun TECH_A 9001 milik 211 → 212', async () => {
    const session = sessions.admin4
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session,
    })
    assert.equal(res.affectedRows, 1)
    assert.equal(res.alreadyDone, false)
    assert.ok(res.newAssignmentId && res.newAssignmentId > 0)
    const after9001 = findAssignment(9001)!
    assert.equal(after9001.assignmentStatus, 'RELEASED')
    assert.notEqual(after9001.releasedAt, null)
    const active321 = findActiveAssignmentsForWO(321)
    assert.equal(active321.length, 1)
    const onlyActive = active321[0] as unknown as { assignedUserId: number }
    assert.equal(Number(onlyActive.assignedUserId), 212)
  })

  await test('T4', 'NOC_OPERATOR full access reassign TECH_A 9001 → 212', async () => {
    const session = sessions.noc50
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session,
    })
    assert.equal(res.affectedRows, 1)
    const after9001 = findAssignment(9001)!
    assert.equal(after9001.assignmentStatus, 'RELEASED')
    const active321 = findActiveAssignmentsForWO(321)
    assert.equal(active321.length, 1)
  })

  await test('T5', 'TT_OPERATOR full access reassign TECH_A 9002 → 211', async () => {
    const session = sessions.tt60
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 211,
      session,
    })
    assert.equal(res.affectedRows, 1)
    const after9002 = findAssignment(9002)!
    assert.equal(after9002.assignmentStatus, 'RELEASED')
    const active = findActiveAssignmentsForWO(322)
    assert.equal(active.length, 1)
  })

  await test('T6', 'SALES_MARKETING DENY reassign siapapun affectedRows 0', async () => {
    const session = sessions.sales30
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 211,
      session,
    })
    assert.equal(res.affectedRows, 0, 'SALES affectedRows 0 DENY')
    const a9002 = findAssignment(9002)!
    assert.notEqual(a9002.assignmentStatus, 'RELEASED', 'assignment TIDAK di mutate')
    assert.equal(a9002.releasedAt, null)
  })

  await test('T7', 'invalid TECH_B ID: NaN / string kosong / negative → affectedRows 0', async () => {
    const session = sessions.admin4
    const invalidCases: unknown[] = [NaN, -5, 0, 3.14, 'abc', '', '  ']
    for (const v of invalidCases) {
      const bIdInput = v as number
      const res = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: 9002,
        targetTechBId: bIdInput,
        session,
      })
      assert.equal(
        res.affectedRows,
        0,
        `invalid TECH_B value ${JSON.stringify(v)} → affectedRows 0`,
      )
    }
  })

  await test('T8', 'TECH_B nonexistent user id out of range (tidak ada) → DENY', async () => {
    setMockUsers([{ id: 211, status: 'ACTIVE', roleCode: 'TEKNISI' }])
    const session = sessions.admin4
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 99999,
      session,
    })
    assert.equal(res.affectedRows, 0)
  })

  await test('T9', 'TECH_B inactive status = INACTIVE → DENY', async () => {
    setMockUsers([{ id: 211, status: 'INACTIVE', roleCode: 'TEKNISI' }])
    const session = sessions.admin4
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 211,
      session,
    })
    assert.equal(res.affectedRows, 0)
  })

  await test('T10', 'TECH_B non technician (role ADMIN auth_roles.code=ADMIN) → DENY', async () => {
    setMockUsers([{ id: 444, status: 'ACTIVE', roleCode: 'ADMIN' }])
    const session = sessions.admin4
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 444,
      session,
    })
    assert.equal(res.affectedRows, 0)
  })

  await test('T11', 'duplicate TECH_B already active same WO → reject', async () => {
    const session = sessions.admin4
    const beforeInsert = mockTrackingWorkOrderAssignments.length
    const dupRow = {
      id: 9999,
      workOrderId: 322,
      assignedUserId: 211,
      assignmentRole: 'FIELD_TECHNICIAN',
      assignmentStatus: 'ASSIGNED',
      isPrimary: 0,
      assignedAt: '2026-08-25 10:00:00',
      acceptedAt: null,
      releasedAt: null,
      notes: 'duplicate test',
      assignedUsername: 'duplicate.tech',
      assignedFullName: 'Duplicate Tech',
    } as never
    mockTrackingWorkOrderAssignments.push(dupRow)
    assert.equal(mockTrackingWorkOrderAssignments.length, beforeInsert + 1)
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 211,
      session,
    })
    assert.equal(res.affectedRows, 0, 'affectedRows 0 karena TECH_B 211 sudah active di WO 322')
    const after9002 = findAssignment(9002)!
    assert.notEqual(after9002.assignmentStatus, 'RELEASED', 'TECH_A TIDAK direlease jika duplicate B')
  })

  await test('T12', 'TECH_A release preserves is_primary (nilai asli tidak diubah saat release)', async () => {
    const beforeTechA = findAssignment(9001)!
    const beforePrimary = Number(
      (beforeTechA as unknown as { isPrimary: number }).isPrimary,
    )
    assert.ok(beforePrimary === 1, 'default 9001 is primary 1')
    const session = sessions.admin4
    await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session,
    })
    const afterTechA = findAssignment(9001)!
    const afterPrimary = Number(
      (afterTechA as unknown as { isPrimary: number }).isPrimary,
    )
    assert.equal(afterTechA.assignmentStatus, 'RELEASED')
    assert.equal(
      afterPrimary,
      beforePrimary,
      `is_primary TECH_A setelah release TETAP ${beforePrimary} (tidak di-set 0)`,
    )
  })

  await test('T13', 'TECH_B inserted is_primary=1 pada row baru', async () => {
    const session = sessions.admin4
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9002,
      targetTechBId: 211,
      session,
    })
    assert.ok(res.newAssignmentId)
    const newTechB = findAssignment(res.newAssignmentId!)!
    const newPrimary = Number(
      (newTechB as unknown as { isPrimary: number }).isPrimary,
    )
    assert.equal(newPrimary, 1, 'TECH_B baru isPrimary = 1')
  })

  await test('T14', 'single-active invariant: after reassign active count exactly 1', async () => {
    const session = sessions.admin4
    await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session,
    })
    const active = findActiveAssignmentsForWO(321)
    assert.equal(active.length, 1, 'WO 321 active TECH = 1')
  })

  await test(
    'T15',
    'existing other active TECH di WO (bukan TECH_A) → throw ROLLBACK, tidak menghasilkan TECH_B insert',
    async () => {
      const session = sessions.admin4
      const extraId = 7777
      const beforeCount = mockTrackingWorkOrderAssignments.length + 1
      mockTrackingWorkOrderAssignments.push({
        id: extraId,
        workOrderId: 322,
        assignedUserId: 222,
        assignmentRole: 'FIELD_TECHNICIAN',
        assignmentStatus: 'ASSIGNED',
        isPrimary: 0,
        assignedAt: '2026-08-25 12:00:00',
        acceptedAt: null,
        releasedAt: null,
        notes: 'active TECH lain (bukan TECH_A)',
        assignedUsername: 'extra.tech.222',
        assignedFullName: 'Extra Tech 222',
      } as never)
      assert.equal(
        mockTrackingWorkOrderAssignments.length,
        beforeCount,
        'setup beforeCount',
      )
      await assert.rejects(
        async () => {
          await reassignServiceWorkOrderAssignmentMock({
            assignmentAId: 9002,
            targetTechBId: 211,
            session,
          })
        },
        /field technician aktif lain|teknisi aktif lain|Masih ada field technician aktif/i,
        'harus throw error karena masih ada active TECH lain selain TECH_A setelah release TECH_A',
      )
      const maxIdBefore = mockTrackingWorkOrderAssignments.reduce(
        (m, rRaw) =>
          Math.max(m, Number((rRaw as unknown as { id: number }).id ?? 0)),
        0,
      )
      assert.equal(
        mockTrackingWorkOrderAssignments.length,
        beforeCount,
        'tidak ada row baru TECH_B yang di-insert, karena rollback other active TECH',
      )
      const maxIdAfter = mockTrackingWorkOrderAssignments.reduce(
        (m, rRaw) =>
          Math.max(m, Number((rRaw as unknown as { id: number }).id ?? 0)),
        0,
      )
      assert.equal(
        maxIdAfter,
        maxIdBefore,
        'TIDAK MENAMBAH id assignment baru pada failure case rollback',
      )
    },
  )

  await test(
    'T16',
    'idempotent identical retry request kedua kalinya = NO-OP SUCCESS (alreadyDone true, tanpa mutate)',
    async () => {
      const session = sessions.admin4
      const r1 = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: 9001,
        targetTechBId: 212,
        session,
      })
      assert.equal(r1.affectedRows, 1, 'first call 1')
      assert.equal(r1.alreadyDone, false)
      const newIdFirst = r1.newAssignmentId
      assert.ok(newIdFirst)
      const newTechAfterFirst = findAssignment(newIdFirst)!
      const releasedAtAfterFirst = String(
        (findAssignment(9001)! as unknown as { releasedAt: string }).releasedAt,
      )

      const r2 = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: 9001,
        targetTechBId: 212,
        session,
      })
      assert.equal(r2.affectedRows, 1, 'second call affectedRows 1 (NO-OP success)')
      assert.equal(r2.alreadyDone, true, 'alreadyDone true OPTION 1')
      assert.equal(
        r2.newAssignmentId,
        newIdFirst,
        'return existing TECH_B ID tanpa insert row baru',
      )
      const releasedAtSecond = String(
        (findAssignment(9001)! as unknown as { releasedAt: string }).releasedAt,
      )
      assert.equal(
        releasedAtSecond,
        releasedAtAfterFirst,
        'released_at TECH_A TIDAK di-override (audit preserved)',
      )
      const totalRows = mockTrackingWorkOrderAssignments.length
      // re-run original (pre restore) count = originalAssignments.length + 1 new. Ensure no extra rows.
      assert.equal(
        totalRows,
        originalAssignments.length + 1,
        'TIDAK MENAMBAH row baru pada request kedua HANYA NO-OP',
      )
      void newTechAfterFirst
    },
  )

  await test(
    'T17',
    'concurrent/double reassign safety (sequential simulasi lock): first berhasil second NO-OP atau success idem',
    async () => {
      const session = sessions.admin4
      const first = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: 9002,
        targetTechBId: 211,
        session,
      })
      const second = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: 9002,
        targetTechBId: 211,
        session,
      })
      assert.equal(first.affectedRows, 1)
      assert.equal(second.affectedRows, 1)
      assert.equal(second.alreadyDone, true, 'second idempotent NO-OP success')
      const active = findActiveAssignmentsForWO(322)
      assert.equal(active.length, 1, 'TIDAK ADA duplicate active dari double request')
      assert.equal(
        Number((active[0] as unknown as { assignedUserId: number }).assignedUserId),
        211,
      )
    },
  )

  await test(
    'T18',
    'rollback atomicity: saat insert TECH_B fail digagalkan via other active TECH lain → TECH_A ROLLBACK TIDAK ikut ter-release',
    async () => {
      const session = sessions.admin4
      // Insert TECH_X active lain di WO 321 selain TECH_A 9001
      const otherActive = {
        id: 5555,
        workOrderId: 321,
        assignedUserId: 250,
        assignmentRole: 'FIELD_TECHNICIAN',
        assignmentStatus: 'ASSIGNED',
        isPrimary: 0,
        assignedAt: '2026-08-26 00:00:00',
        acceptedAt: null,
        releasedAt: null,
        notes: 'lainnya',
        assignedUsername: 'tech.250',
        assignedFullName: 'Tech 250',
      } as never
      mockTrackingWorkOrderAssignments.push(otherActive)
      await assert.rejects(
        () =>
          reassignServiceWorkOrderAssignmentMock({
            assignmentAId: 9001,
            targetTechBId: 212,
            session,
          }),
        /field technician aktif lain|teknisi aktif lain|Masih ada field technician aktif/i,
      )
      const techA9001 = findAssignment(9001)!
      assert.equal(
        techA9001.assignmentStatus,
        'ACCEPTED',
        'ROLLBACK: TECH_A status tetap ACCEPTED asli, TIDAK SET RELEASED karena gagal → atomic',
      )
      assert.equal(techA9001.releasedAt, null, 'releasedAt TECH_A tetap null')
    },
  )

  // Regression: other non-authorized roles (FINANCE, HR, GA, CS) → DENY.
  await test('TREG-1', 'FINANCE non-authorized role DENY', async () => {
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session: sessions.finance70,
    })
    assert.equal(res.affectedRows, 0)
  })

  await test('TREG-2', 'OWNER full access reassign success', async () => {
    const res = await reassignServiceWorkOrderAssignmentMock({
      assignmentAId: 9001,
      targetTechBId: 212,
      session: sessions.owner1,
    })
    assert.equal(res.affectedRows, 1)
  })

  process.stdout.write(
    `\nP5.2 REASSIGN TESTS RESULT = ${pass} PASS, ${fail} FAIL dari ${
      pass + fail
    } total\n`,
  )
  if (errors.length > 0) {
    process.stdout.write('\nERRORS:\n')
    for (const err of errors) {
      process.stdout.write(`  - ${err}\n`)
    }
    process.exitCode = 1
  }
}

function resolveNewAssignmentMaxIdAfterTest(): number {
  return mockTrackingWorkOrderAssignments.reduce(
    (max, rowRaw) =>
      Math.max(max, Number((rowRaw as unknown as { id: number }).id ?? 0)),
    9001,
  )
}

void runAllP52Tests()
