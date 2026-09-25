import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import { ensureHrBatch02aEmployeeCodeUnique } from '@/lib/services/hr-batch02a-schema-ensure'
import {
  detectSupervisorCycle,
  insertEmployeeHistoryEvent,
  type HrEmployeeHistoryEvent,
} from '@/lib/services/hr-employee-history-service'

type BranchRow = {
  id: number
}

type DivisionRow = {
  id: number
}

type TeamRow = {
  id: number
}

type PositionRow = {
  id: number
}

type EmployeeCodeRow = {
  employeeCode: string | null
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

type FullEmployeeRow = {
  id: number
  employeeCode: string
  branchId: number | null
  divisionId: number | null
  teamId: number | null
  positionId: number | null
  supervisorId: number | null
  contractDocId: number | null
  contractStartDate: string | null
  contractEndDate: string | null
  exitDate: string | null
  exitReason: string | null
  userId: number | null
  employmentStatus: string
  baseSalary: number
  fullName: string
  status: string | null
}

type EmailCheckRow = {
  id: number
}

type FpMappingRow = {
  id: number
  enrollmentStatus: string
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function sanitizeEmail(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return null
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(raw)) return null
  return raw
}

function parseNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseNullableDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const raw = String(value).trim()
  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) return null
  return raw
}

async function generateEmployeeCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `EMP-${year}${month}-%`
  const rows = await runReviewDbQuery<EmployeeCodeRow>(
    `
      SELECT employee_code AS employeeCode
      FROM hr_employees
      WHERE employee_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.employeeCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `EMP-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

async function checkEmailCorporateUnique(
  emailCorporate: string | null,
  excludeEmployeeId?: number,
): Promise<{ duplicate: boolean; existingId?: number }> {
  if (!emailCorporate) return { duplicate: false }

  const params: unknown[] = [emailCorporate]
  let excludeClause = ''
  if (excludeEmployeeId !== undefined) {
    excludeClause = ' AND id <> ?'
    params.push(excludeEmployeeId)
  }

  const rows = await runReviewDbQuery<EmailCheckRow>(
    `SELECT id FROM hr_employees WHERE UPPER(email_corporate) = UPPER(?)${excludeClause} LIMIT 1`,
    params,
  )

  if (rows.length > 0) {
    return { duplicate: true, existingId: rows[0].id }
  }
  return { duplicate: false }
}

async function checkTeamExists(teamId: number | null): Promise<boolean> {
  if (teamId === null) return true
  const rows = await runReviewDbQuery<TeamRow>(`SELECT id FROM org_teams WHERE id = ? LIMIT 1`, [teamId])
  return rows.length > 0
}

async function checkPositionExists(positionId: number | null): Promise<boolean> {
  if (positionId === null) return true
  const rows = await runReviewDbQuery<PositionRow>(`SELECT id FROM org_positions WHERE id = ? LIMIT 1`, [positionId])
  return rows.length > 0
}

function validateContractStatusConsistency(
  employmentStatus: string,
  contractStartDate: string | null,
  contractEndDate: string | null,
): string | null {
  const status = String(employmentStatus ?? '').trim().toUpperCase()
  if (status === 'PKWT') {
    if (!contractEndDate) {
      return 'Untuk status PKWT, contract_end_date wajib diisi.'
    }
  }
  return null
}

function validateExitDateConsistency(
  employmentStatus: string,
  exitDate: string | null,
): string | null {
  const status = String(employmentStatus ?? '').trim().toUpperCase()
  const exitStatuses = new Set(['RESIGNED', 'TERMINATED', 'PENSIUN'])
  if (exitStatuses.has(status) && !exitDate) {
    return `Untuk status ${status}, exit_date wajib diisi.`
  }
  return null
}

function detectMutations(
  prev: FullEmployeeRow | null,
  next: Partial<FullEmployeeRow>,
): HrEmployeeHistoryEvent[] {
  const events: HrEmployeeHistoryEvent[] = []
  if (!prev) {
    events.push('HIRED')
    return events
  }

  const hasMutationBranchDiv =
    next.branchId !== undefined && prev.branchId !== next.branchId ||
    next.divisionId !== undefined && prev.divisionId !== next.divisionId
  if (hasMutationBranchDiv) events.push('MUTATION_BRANCH_DIV')

  if (next.teamId !== undefined && prev.teamId !== next.teamId) events.push('TEAM_CHANGE')
  if (next.positionId !== undefined && prev.positionId !== next.positionId) events.push('POSITION_CHANGE')
  if (next.supervisorId !== undefined && prev.supervisorId !== next.supervisorId) events.push('SUPERVISOR_CHANGE')

  const hasContractChange =
    next.contractDocId !== undefined && prev.contractDocId !== next.contractDocId ||
    next.contractStartDate !== undefined && prev.contractStartDate !== next.contractStartDate ||
    next.contractEndDate !== undefined && prev.contractEndDate !== next.contractEndDate
  if (hasContractChange) events.push('CONTRACT_CHANGE')

  if (next.employmentStatus !== undefined && prev.employmentStatus !== next.employmentStatus) {
    events.push('STATUS_CHANGE')
    const nextStatus = String(next.employmentStatus ?? '').trim().toUpperCase()
    if (['RESIGNED', 'TERMINATED', 'PENSIUN'].includes(nextStatus)) {
      events.push('RESIGN_TERMINATE')
    }
    const prevStatus = String(prev.employmentStatus ?? '').trim().toUpperCase()
    if (prevStatus === 'ARCHIVED' && nextStatus !== 'ARCHIVED') {
      events.push('REHIRE')
    }
  }

  if (next.baseSalary !== undefined && prev.baseSalary !== Number(next.baseSalary)) {
    events.push('SALARY_CHANGE')
  }

  if (next.userId !== undefined && prev.userId !== next.userId) {
    events.push('AUTH_USER_MAPPING')
  }

  return events
}

function buildSnapshot(row: FullEmployeeRow): Record<string, unknown> {
  return {
    id: row.id,
    employee_code: row.employeeCode,
    full_name: row.fullName,
    branch_id: row.branchId,
    division_id: row.divisionId,
    team_id: row.teamId,
    position_id: row.positionId,
    supervisor_id: row.supervisorId,
    contract_doc_id: row.contractDocId,
    contract_start_date: row.contractStartDate,
    contract_end_date: row.contractEndDate,
    exit_date: row.exitDate,
    exit_reason: row.exitReason,
    user_id: row.userId,
    employment_status: row.employmentStatus,
    base_salary: row.baseSalary,
    status: row.status,
  }
}

async function autoRevokeFpMappings(employeeId: number, actorRef: string) {
  const mappings = await runReviewDbQuery<FpMappingRow>(
    `
      SELECT id, enrollment_status AS enrollmentStatus
      FROM hr_fp_employee_mappings
      WHERE employee_id = ?
    `,
    [employeeId],
  )

  if (mappings.length === 0) return 0

  const result = await runReviewDbExecute<InsertResult>(
    `
      UPDATE hr_fp_employee_mappings
      SET enrollment_status = 'REVOKED',
          revoked_at = NOW()
      WHERE employee_id = ?
        AND enrollment_status <> 'REVOKED'
    `,
    [employeeId],
  )

  const affected = Number(result.affectedRows ?? 0)
  if (affected > 0) {
    await recordHrAudit({
      actionType: 'FP_MAP_EMPLOYEE',
      actor: actorRef,
      targetRef: `EMP-${employeeId}`,
      detail: `Auto revoke ${affected} FP employee mappings untuk employee_id=${employeeId} karena status employment berubah tidak aktif.`,
    })
  }
  return affected
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch01Schema()
  await ensureHrBatch02aEmployeeCodeUnique()

  try {
    const payload = (await request.json()) as {
      branchCode?: unknown
      divisionCode?: unknown
      fullName?: unknown
      positionName?: unknown
      employmentStatus?: unknown
      joinDate?: unknown
      baseSalary?: unknown
      phone?: unknown
      whatsapp?: unknown
      emailCorporate?: unknown
      teamId?: unknown
      positionId?: unknown
      supervisorId?: unknown
      contractDocId?: unknown
      contractStartDate?: unknown
      contractEndDate?: unknown
      exitDate?: unknown
      exitReason?: unknown
      userId?: unknown
      status?: unknown
    }

    const branchCode = String(payload.branchCode ?? '').trim()
    const divisionCode = String(payload.divisionCode ?? '').trim()
    const fullName = String(payload.fullName ?? '').trim()
    const positionName = String(payload.positionName ?? '').trim()
    const employmentStatus = String(payload.employmentStatus ?? '').trim() || 'KARYAWAN'
    const joinDateRaw = String(payload.joinDate ?? '').trim()
    const baseSalary = normalizePrice(payload.baseSalary)
    const phone = String(payload.phone ?? '').trim()
    const whatsapp = String(payload.whatsapp ?? '').trim()
    const emailCorporate = sanitizeEmail(payload.emailCorporate)
    const teamId = parseNullableInt(payload.teamId)
    const positionId = parseNullableInt(payload.positionId)
    const supervisorId = parseNullableInt(payload.supervisorId)
    const contractDocId = parseNullableInt(payload.contractDocId)
    const contractStartDate = parseNullableDate(payload.contractStartDate)
    const contractEndDate = parseNullableDate(payload.contractEndDate)
    const exitDate = parseNullableDate(payload.exitDate)
    const exitReason = payload.exitReason !== undefined && payload.exitReason !== null && String(payload.exitReason).trim() !== ''
      ? String(payload.exitReason).trim()
      : null
    const userId = parseNullableInt(payload.userId)

    if (!fullName) {
      return Response.json({ message: 'Nama karyawan wajib diisi.' }, { status: 400 })
    }
    if (baseSalary === null || baseSalary < 0) {
      return Response.json({ message: 'Gaji pokok tidak valid.' }, { status: 400 })
    }
    if (payload.emailCorporate !== undefined && payload.emailCorporate !== null && String(payload.emailCorporate).trim() !== '' && !emailCorporate) {
      return Response.json({ message: 'Format email_corporate tidak valid.' }, { status: 400 })
    }

    const joinDate = joinDateRaw ? new Date(joinDateRaw) : null
    if (joinDate && !Number.isFinite(joinDate.getTime())) {
      return Response.json({ message: 'Tanggal join tidak valid.' }, { status: 400 })
    }

    const emailCheck = await checkEmailCorporateUnique(emailCorporate)
    if (emailCheck.duplicate) {
      return Response.json(
        { message: `Email corporate ${emailCorporate} sudah terdaftar pada employee ID lain.` },
        { status: 400 },
      )
    }

    if (teamId !== null) {
      const teamExists = await checkTeamExists(teamId)
      if (!teamExists) {
        return Response.json({ message: 'team_id tidak ditemukan di org_teams.' }, { status: 400 })
      }
    }

    if (positionId !== null) {
      const positionExists = await checkPositionExists(positionId)
      if (!positionExists) {
        return Response.json({ message: 'position_id tidak ditemukan di org_positions.' }, { status: 400 })
      }
    }

    if (supervisorId !== null) {
      const [supExists] = await runReviewDbQuery<{ id: number }>(
        `SELECT id FROM hr_employees WHERE id = ? LIMIT 1`,
        [supervisorId],
      )
      if (!supExists) {
        return Response.json({ message: 'supervisor_id tidak ditemukan di hr_employees.' }, { status: 400 })
      }
    }

    const contractError = validateContractStatusConsistency(
      employmentStatus,
      contractStartDate,
      contractEndDate,
    )
    if (contractError) {
      return Response.json({ message: contractError }, { status: 400 })
    }

    const exitError = validateExitDateConsistency(employmentStatus, exitDate)
    if (exitError) {
      return Response.json({ message: exitError }, { status: 400 })
    }

    let branchId: number | null = null
    if (branchCode) {
      const [branch] = await runReviewDbQuery<BranchRow>(
        `
          SELECT id
          FROM org_branches
          WHERE UPPER(code) = UPPER(?)
          LIMIT 1
        `,
        [branchCode],
      )
      if (!branch) {
        return Response.json({ message: 'Kode cabang tidak ditemukan di review DB.' }, { status: 404 })
      }
      branchId = branch.id
    }

    let divisionId: number | null = null
    if (divisionCode) {
      const [division] = await runReviewDbQuery<DivisionRow>(
        `
          SELECT id
          FROM org_divisions
          WHERE UPPER(code) = UPPER(?)
          LIMIT 1
        `,
        [divisionCode],
      )
      if (!division) {
        return Response.json({ message: 'Kode divisi tidak ditemukan di review DB.' }, { status: 404 })
      }
      divisionId = division.id
    }

    const MAX_CODE_ATTEMPTS = 3
    let employeeCode: string = ''
    let insertResult: InsertResult = {}
    let codeAttempt = 0
    while (codeAttempt < MAX_CODE_ATTEMPTS) {
      codeAttempt++
      employeeCode = await generateEmployeeCode()
      try {
        insertResult = await runReviewDbExecute<InsertResult>(
          `
            INSERT INTO hr_employees (
              branch_id,
              division_id,
              employee_code,
              full_name,
              position_name,
              employment_status,
              join_date,
              base_salary,
              phone,
              whatsapp,
              email_corporate,
              team_id,
              position_id,
              supervisor_id,
              contract_doc_id,
              contract_start_date,
              contract_end_date,
              exit_date,
              exit_reason,
              user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            branchId,
            divisionId,
            employeeCode,
            fullName,
            positionName || null,
            employmentStatus,
            joinDateRaw || null,
            baseSalary,
            phone || null,
            whatsapp || null,
            emailCorporate,
            teamId,
            positionId,
            supervisorId,
            contractDocId,
            contractStartDate,
            contractEndDate,
            exitDate,
            exitReason,
            userId,
          ],
        )
        break
      } catch (insertErr: unknown) {
        const errText = String(insertErr instanceof Error ? insertErr.message : insertErr)
        const isDuplicateCode =
          (errText.includes('ER_DUP_ENTRY') || errText.includes('Duplicate entry')) &&
          (errText.includes('uq_hr_employees_employee_code') || errText.includes(`'${employeeCode}'`))
        if (isDuplicateCode && codeAttempt < MAX_CODE_ATTEMPTS) {
          continue
        }
        throw insertErr
      }
    }

    const newEmployeeId = Number(insertResult.insertId ?? 0)
    const actorRef = `${session.displayName} (${session.username})`
    const actorUserId = Number(session.userId ?? 0)

    if (newEmployeeId > 0) {
      const snapshot: Record<string, unknown> = {
        employee_code: employeeCode,
        full_name: fullName,
        branch_id: branchId,
        division_id: divisionId,
        team_id: teamId,
        position_id: positionId,
        supervisor_id: supervisorId,
        employment_status: employmentStatus,
        base_salary: baseSalary,
        email_corporate: emailCorporate,
        contract_start_date: contractStartDate,
        contract_end_date: contractEndDate,
        exit_date: exitDate,
        user_id: userId,
      }
      await insertEmployeeHistoryEvent(newEmployeeId, 'HIRED', actorUserId, {
        effectiveDate: joinDateRaw || new Date().toISOString().slice(0, 10),
        newValue: snapshot,
      })
      await recordHrAudit({
        actionType: 'EMPLOYEE_HISTORY_EVENT',
        actor: actorRef,
        targetRef: employeeCode,
        detail: `History event HIRED untuk ${employeeCode} - ${fullName} dicatat otomatis saat create.`,
      })
    }

    const nextStatus = String(employmentStatus ?? '').trim().toUpperCase()
    if (['RESIGNED', 'TERMINATED', 'PENSIUN', 'ARCHIVED'].includes(nextStatus) && newEmployeeId > 0) {
      await autoRevokeFpMappings(newEmployeeId, actorRef)
    }

    await recordHrAudit({
      actionType: 'EMPLOYEE_CREATE',
      actor: actorRef,
      targetRef: employeeCode,
      detail: `Employee ${employeeCode} untuk ${fullName} dibuat via web HR dengan status ${employmentStatus}.`,
    })

    return Response.json({
      message: `Employee ${employeeCode} untuk ${fullName} berhasil disimpan.`,
      employee_id: newEmployeeId,
      employee_code: employeeCode,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch01Schema()

  try {
    const payload = (await request.json()) as {
      employeeId?: unknown
      employeeCode?: unknown
      branchCode?: unknown
      divisionCode?: unknown
      fullName?: unknown
      positionName?: unknown
      employmentStatus?: unknown
      joinDate?: unknown
      baseSalary?: unknown
      phone?: unknown
      whatsapp?: unknown
      emailCorporate?: unknown
      teamId?: unknown
      positionId?: unknown
      supervisorId?: unknown
      contractDocId?: unknown
      contractStartDate?: unknown
      contractEndDate?: unknown
      exitDate?: unknown
      exitReason?: unknown
      userId?: unknown
      reason?: unknown
      correctionFlag?: unknown
    }

    const employeeId = parseNullableInt(payload.employeeId)
    const employeeCodeFromPayload = String(payload.employeeCode ?? '').trim()
    const fullNameRaw = payload.fullName !== undefined ? String(payload.fullName).trim() : undefined
    const positionNameRaw = payload.positionName !== undefined ? String(payload.positionName).trim() : undefined
    const employmentStatusRaw = payload.employmentStatus !== undefined
      ? (String(payload.employmentStatus).trim() || undefined)
      : undefined
    const joinDateRaw = payload.joinDate !== undefined ? String(payload.joinDate).trim() : undefined
    const baseSalaryRaw = payload.baseSalary !== undefined ? normalizePrice(payload.baseSalary) : undefined
    const phoneRaw = payload.phone !== undefined ? String(payload.phone).trim() : undefined
    const whatsappRaw = payload.whatsapp !== undefined ? String(payload.whatsapp).trim() : undefined
    const emailCorporateRaw = payload.emailCorporate !== undefined ? sanitizeEmail(payload.emailCorporate) : undefined
    const teamIdRaw = payload.teamId !== undefined ? parseNullableInt(payload.teamId) : undefined
    const positionIdRaw = payload.positionId !== undefined ? parseNullableInt(payload.positionId) : undefined
    const supervisorIdRaw = payload.supervisorId !== undefined ? parseNullableInt(payload.supervisorId) : undefined
    const contractDocIdRaw = payload.contractDocId !== undefined ? parseNullableInt(payload.contractDocId) : undefined
    const contractStartDateRaw = payload.contractStartDate !== undefined ? parseNullableDate(payload.contractStartDate) : undefined
    const contractEndDateRaw = payload.contractEndDate !== undefined ? parseNullableDate(payload.contractEndDate) : undefined
    const exitDateRaw = payload.exitDate !== undefined ? parseNullableDate(payload.exitDate) : undefined
    const exitReasonRaw = payload.exitReason !== undefined
      ? (payload.exitReason !== null && String(payload.exitReason).trim() !== '' ? String(payload.exitReason).trim() : null)
      : undefined
    const userIdRaw = payload.userId !== undefined ? parseNullableInt(payload.userId) : undefined
    const correctionFlag = payload.correctionFlag === true || String(payload.correctionFlag ?? '').trim() === '1'
    const reasonText = payload.reason !== undefined && payload.reason !== null && String(payload.reason).trim() !== ''
      ? String(payload.reason).trim()
      : null

    if (!employeeId && !employeeCodeFromPayload) {
      return Response.json({ message: 'employee_id atau employee_code wajib diisi untuk update.' }, { status: 400 })
    }

    if (payload.emailCorporate !== undefined && payload.emailCorporate !== null && String(payload.emailCorporate).trim() !== '') {
      if (!emailCorporateRaw) {
        return Response.json({ message: 'Format email_corporate tidak valid.' }, { status: 400 })
      }
    }

    let whereClause = ''
    const whereParams: unknown[] = []
    if (employeeId) {
      whereClause = 'WHERE id = ?'
      whereParams.push(employeeId)
    } else {
      whereClause = 'WHERE UPPER(employee_code) = UPPER(?)'
      whereParams.push(employeeCodeFromPayload)
    }

    const existingRows = await runReviewDbQuery<FullEmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          branch_id AS branchId,
          division_id AS divisionId,
          team_id AS teamId,
          position_id AS positionId,
          supervisor_id AS supervisorId,
          contract_doc_id AS contractDocId,
          CAST(contract_start_date AS CHAR) AS contractStartDate,
          CAST(contract_end_date AS CHAR) AS contractEndDate,
          CAST(exit_date AS CHAR) AS exitDate,
          exit_reason AS exitReason,
          user_id AS userId,
          employment_status AS employmentStatus,
          base_salary AS baseSalary,
          full_name AS fullName,
          status AS status
        FROM hr_employees
        ${whereClause}
        LIMIT 1
      `,
      whereParams,
    )

    if (existingRows.length === 0) {
      return Response.json({ message: 'Employee tidak ditemukan di review DB.' }, { status: 404 })
    }

    const existing = existingRows[0]
    const resolvedEmployeeId = existing.id

    if (emailCorporateRaw !== undefined) {
      const emailCheck = await checkEmailCorporateUnique(emailCorporateRaw, resolvedEmployeeId)
      if (emailCheck.duplicate) {
        return Response.json(
          { message: `Email corporate ${emailCorporateRaw} sudah terdaftar pada employee ID lain.` },
          { status: 400 },
        )
      }
    }

    if (teamIdRaw !== undefined && teamIdRaw !== null) {
      const teamExists = await checkTeamExists(teamIdRaw)
      if (!teamExists) {
        return Response.json({ message: 'team_id tidak ditemukan di org_teams.' }, { status: 400 })
      }
    }

    if (positionIdRaw !== undefined && positionIdRaw !== null) {
      const positionExists = await checkPositionExists(positionIdRaw)
      if (!positionExists) {
        return Response.json({ message: 'position_id tidak ditemukan di org_positions.' }, { status: 400 })
      }
    }

    if (supervisorIdRaw !== undefined && supervisorIdRaw !== null) {
      if (supervisorIdRaw === resolvedEmployeeId) {
        return Response.json(
          { message: 'supervisor_id tidak boleh sama dengan employee_id itu sendiri (A→A cycle).' },
          { status: 400 },
        )
      }
      const [supExists] = await runReviewDbQuery<{ id: number }>(
        `SELECT id FROM hr_employees WHERE id = ? LIMIT 1`,
        [supervisorIdRaw],
      )
      if (!supExists) {
        return Response.json({ message: 'supervisor_id tidak ditemukan di hr_employees.' }, { status: 400 })
      }
      try {
        await detectSupervisorCycle(resolvedEmployeeId, supervisorIdRaw)
      } catch (err) {
        if (err instanceof Error && err.message === 'CIRCULAR') {
          return Response.json(
            { message: 'Circular reference terdeteksi pada rantai supervisor. Supervisor baru menciptakan cycle A→B→A.' },
            { status: 400 },
          )
        }
        throw err
      }
    }

    const effectiveEmploymentStatus = employmentStatusRaw !== undefined ? employmentStatusRaw : existing.employmentStatus
    const effectiveContractEndDate = contractEndDateRaw !== undefined ? contractEndDateRaw : existing.contractEndDate
    const effectiveContractStartDate = contractStartDateRaw !== undefined ? contractStartDateRaw : existing.contractStartDate
    const effectiveExitDate = exitDateRaw !== undefined ? exitDateRaw : existing.exitDate

    const contractError = validateContractStatusConsistency(
      effectiveEmploymentStatus,
      effectiveContractStartDate,
      effectiveContractEndDate,
    )
    if (contractError) {
      return Response.json({ message: contractError }, { status: 400 })
    }

    const exitError = validateExitDateConsistency(effectiveEmploymentStatus, effectiveExitDate)
    if (exitError) {
      return Response.json({ message: exitError }, { status: 400 })
    }

    let branchId = existing.branchId
    if (payload.branchCode !== undefined) {
      const branchCode = String(payload.branchCode ?? '').trim()
      if (branchCode === '') {
        branchId = null
      } else {
        const [branch] = await runReviewDbQuery<BranchRow>(
          `SELECT id FROM org_branches WHERE UPPER(code) = UPPER(?) LIMIT 1`,
          [branchCode],
        )
        if (!branch) {
          return Response.json({ message: 'Kode cabang tidak ditemukan di review DB.' }, { status: 404 })
        }
        branchId = branch.id
      }
    }

    let divisionId = existing.divisionId
    if (payload.divisionCode !== undefined) {
      const divisionCode = String(payload.divisionCode ?? '').trim()
      if (divisionCode === '') {
        divisionId = null
      } else {
        const [division] = await runReviewDbQuery<DivisionRow>(
          `SELECT id FROM org_divisions WHERE UPPER(code) = UPPER(?) LIMIT 1`,
          [divisionCode],
        )
        if (!division) {
          return Response.json({ message: 'Kode divisi tidak ditemukan di review DB.' }, { status: 404 })
        }
        divisionId = division.id
      }
    }

    const updateColumns: string[] = []
    const updateValues: unknown[] = []

    if (payload.branchCode !== undefined) {
      updateColumns.push('branch_id = ?')
      updateValues.push(branchId)
    }
    if (payload.divisionCode !== undefined) {
      updateColumns.push('division_id = ?')
      updateValues.push(divisionId)
    }
    if (fullNameRaw !== undefined) {
      updateColumns.push('full_name = ?')
      updateValues.push(fullNameRaw || null)
    }
    if (positionNameRaw !== undefined) {
      updateColumns.push('position_name = ?')
      updateValues.push(positionNameRaw || null)
    }
    if (employmentStatusRaw !== undefined) {
      updateColumns.push('employment_status = ?')
      updateValues.push(employmentStatusRaw)
    }
    if (joinDateRaw !== undefined) {
      updateColumns.push('join_date = ?')
      updateValues.push(joinDateRaw || null)
    }
    if (baseSalaryRaw !== undefined) {
      updateColumns.push('base_salary = ?')
      updateValues.push(baseSalaryRaw)
    }
    if (phoneRaw !== undefined) {
      updateColumns.push('phone = ?')
      updateValues.push(phoneRaw || null)
    }
    if (whatsappRaw !== undefined) {
      updateColumns.push('whatsapp = ?')
      updateValues.push(whatsappRaw || null)
    }
    if (emailCorporateRaw !== undefined) {
      updateColumns.push('email_corporate = ?')
      updateValues.push(emailCorporateRaw)
    }
    if (teamIdRaw !== undefined) {
      updateColumns.push('team_id = ?')
      updateValues.push(teamIdRaw)
    }
    if (positionIdRaw !== undefined) {
      updateColumns.push('position_id = ?')
      updateValues.push(positionIdRaw)
    }
    if (supervisorIdRaw !== undefined) {
      updateColumns.push('supervisor_id = ?')
      updateValues.push(supervisorIdRaw)
    }
    if (contractDocIdRaw !== undefined) {
      updateColumns.push('contract_doc_id = ?')
      updateValues.push(contractDocIdRaw)
    }
    if (contractStartDateRaw !== undefined) {
      updateColumns.push('contract_start_date = ?')
      updateValues.push(contractStartDateRaw)
    }
    if (contractEndDateRaw !== undefined) {
      updateColumns.push('contract_end_date = ?')
      updateValues.push(contractEndDateRaw)
    }
    if (exitDateRaw !== undefined) {
      updateColumns.push('exit_date = ?')
      updateValues.push(exitDateRaw)
    }
    if (exitReasonRaw !== undefined) {
      updateColumns.push('exit_reason = ?')
      updateValues.push(exitReasonRaw)
    }
    if (userIdRaw !== undefined) {
      updateColumns.push('user_id = ?')
      updateValues.push(userIdRaw)
    }

    if (updateColumns.length === 0) {
      return Response.json({ message: 'Tidak ada field yang diupdate.' }, { status: 409 })
    }

    updateColumns.push('updated_at = CURRENT_TIMESTAMP')

    const nextSnapshotPartial: Partial<FullEmployeeRow> = {}
    if (branchId !== existing.branchId) nextSnapshotPartial.branchId = branchId
    if (divisionId !== existing.divisionId) nextSnapshotPartial.divisionId = divisionId
    if (teamIdRaw !== undefined) nextSnapshotPartial.teamId = teamIdRaw
    if (positionIdRaw !== undefined) nextSnapshotPartial.positionId = positionIdRaw
    if (supervisorIdRaw !== undefined) nextSnapshotPartial.supervisorId = supervisorIdRaw
    if (contractDocIdRaw !== undefined) nextSnapshotPartial.contractDocId = contractDocIdRaw
    if (contractStartDateRaw !== undefined) nextSnapshotPartial.contractStartDate = contractStartDateRaw
    if (contractEndDateRaw !== undefined) nextSnapshotPartial.contractEndDate = contractEndDateRaw
    if (exitDateRaw !== undefined) nextSnapshotPartial.exitDate = exitDateRaw
    if (exitReasonRaw !== undefined) nextSnapshotPartial.exitReason = exitReasonRaw
    if (userIdRaw !== undefined) nextSnapshotPartial.userId = userIdRaw
    if (employmentStatusRaw !== undefined) nextSnapshotPartial.employmentStatus = employmentStatusRaw
    if (baseSalaryRaw !== undefined) nextSnapshotPartial.baseSalary = baseSalaryRaw ?? undefined

    const prevSnapshot = buildSnapshot(existing)
    const merged: FullEmployeeRow = {
      ...existing,
      branchId,
      divisionId,
      teamId: teamIdRaw !== undefined ? teamIdRaw : existing.teamId,
      positionId: positionIdRaw !== undefined ? positionIdRaw : existing.positionId,
      supervisorId: supervisorIdRaw !== undefined ? supervisorIdRaw : existing.supervisorId,
      contractDocId: contractDocIdRaw !== undefined ? contractDocIdRaw : existing.contractDocId,
      contractStartDate: contractStartDateRaw !== undefined ? contractStartDateRaw : existing.contractStartDate,
      contractEndDate: contractEndDateRaw !== undefined ? contractEndDateRaw : existing.contractEndDate,
      exitDate: exitDateRaw !== undefined ? exitDateRaw : existing.exitDate,
      exitReason: exitReasonRaw !== undefined ? exitReasonRaw : existing.exitReason,
      userId: userIdRaw !== undefined ? userIdRaw : existing.userId,
      employmentStatus: employmentStatusRaw !== undefined ? employmentStatusRaw : existing.employmentStatus,
      baseSalary: baseSalaryRaw !== undefined ? (baseSalaryRaw ?? 0) : existing.baseSalary,
      fullName: fullNameRaw !== undefined ? fullNameRaw : existing.fullName,
    }
    const newSnapshot = buildSnapshot(merged)

    const mutationEvents = detectMutations(existing, nextSnapshotPartial)
    if (correctionFlag && mutationEvents.length > 0 && !mutationEvents.includes('CORRECTION')) {
      mutationEvents.push('CORRECTION')
    }

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_employees
        SET ${updateColumns.join(', ')}
        WHERE id = ?
      `,
      [...updateValues, resolvedEmployeeId],
    )

    const actorRef = `${session.displayName} (${session.username})`
    const actorUserId = Number(session.userId ?? 0)

    for (const evt of mutationEvents) {
      await insertEmployeeHistoryEvent(resolvedEmployeeId, evt, actorUserId, {
        effectiveDate: joinDateRaw || exitDateRaw || contractStartDateRaw || new Date().toISOString().slice(0, 10),
        prevValue: prevSnapshot,
        newValue: newSnapshot,
        reason: reasonText,
      })
    }

    if (mutationEvents.length > 0) {
      const eventList = mutationEvents.join(',')
      await recordHrAudit({
        actionType: 'EMPLOYEE_HISTORY_EVENT',
        actor: actorRef,
        targetRef: existing.employeeCode,
        detail: `History event [${eventList}] untuk ${existing.employeeCode} dicatat otomatis. Diff snapshot disimpan.`,
      })
    }

    if (mutationEvents.length > 0) {
      await recordHrAudit({
        actionType: 'EMPLOYEE_UPDATE',
        actor: actorRef,
        targetRef: existing.employeeCode,
        detail: `Employee ${existing.employeeCode} - ${existing.fullName} diperbarui via web HR dengan perubahan: ${mutationEvents.join(', ')}${reasonText ? ` (${reasonText})` : ''}.`,
      })
    }

    if (employmentStatusRaw !== undefined) {
      const nextStatus = String(employmentStatusRaw ?? '').trim().toUpperCase()
      if (['RESIGNED', 'TERMINATED', 'PENSIUN', 'ARCHIVED'].includes(nextStatus)) {
        await autoRevokeFpMappings(resolvedEmployeeId, actorRef)
      }
    }

    return Response.json({
      message: `Employee ${existing.employeeCode} - ${existing.fullName} berhasil diperbarui.`,
      events_recorded: mutationEvents,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
