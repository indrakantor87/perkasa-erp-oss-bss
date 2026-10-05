import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import {
  ensureHrDisciplinaryRecordsTable,
  parsePositiveInt,
} from '@/lib/services/hr-disciplinary-schema-ensure'
import { ensureHrEmployeeKpiTable } from '@/lib/services/hr-employee-kpi-service'

type ProvenColsRow = {
  id: number
  employeeCode: string | null
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
  employmentStatus: string | null
  baseSalary: string | number | null
  fullName: string | null
  status: string | null
}

type CountTotalRow = { total: number }
type OneStringRow = { value: string | null }
type SupervisorRow = { full_name: string | null; employee_code: string | null }

function firstCol(rows: any, fallback: any = null) {
  if (!rows || !rows.length) return fallback
  const r = rows[0]
  if (!r || typeof r !== 'object') return fallback
  const keys = Object.keys(r)
  if (!keys.length) return fallback
  const v = r[keys[0]]
  return v === undefined || v === null ? fallback : v
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })

  try {
    await ensureHrBatch01Schema()
    await ensureHrEmployeeKpiTable()
    await ensureHrDisciplinaryRecordsTable()

    const id = parsePositiveInt(idLocal)
    if (!id) return Response.json({ message: 'id karyawan harus integer positif.' }, { status: 400 })

    const primaryRows = await runReviewDbQuery<ProvenColsRow>(
      `
      SELECT
        he.id AS id,
        he.employee_code AS employeeCode,
        he.branch_id AS branchId,
        he.division_id AS divisionId,
        he.team_id AS teamId,
        he.position_id AS positionId,
        he.supervisor_id AS supervisorId,
        he.contract_doc_id AS contractDocId,
        CAST(he.contract_start_date AS CHAR) AS contractStartDate,
        CAST(he.contract_end_date AS CHAR) AS contractEndDate,
        CAST(he.exit_date AS CHAR) AS exitDate,
        he.exit_reason AS exitReason,
        he.user_id AS userId,
        he.employment_status AS employmentStatus,
        he.base_salary AS baseSalary,
        he.full_name AS fullName,
        he.status AS status
      FROM hr_disciplinary_records hdr
      JOIN hr_employees he
        ON he.id = hdr.employee_id
      WHERE hdr.employee_id = ?
      LIMIT 1
    `,
      [id],
    ).catch(() => [] as ProvenColsRow[])

    const core = primaryRows[0]
      ? primaryRows[0]
      : (
          await runReviewDbQuery<ProvenColsRow>(
            `
            SELECT
              id AS id,
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
            WHERE id = ?
            LIMIT 1
          `,
            [id],
          ).catch(() => [] as ProvenColsRow[])
        )[0] || null

    if (!core) {
      return Response.json({ message: `Karyawan id=${id} tidak ditemukan di hr_employees.` }, { status: 404 })
    }

    const [
      rPhone,
      rWhatsapp,
      rEmail,
      rJoinDate,
      rLegacyPosition,
      rBranchName,
      rDivisionName,
      rTeamName,
      rPositionName,
      rSupervisor,
      cKpi,
      cLoans,
      cDiscipl,
      cSlips,
      cAtt30d,
    ] = await Promise.all([
      runReviewDbQuery<OneStringRow>(`SELECT phone AS value FROM hr_employees WHERE id = ? LIMIT 1`, [id]).catch(() => []),
      runReviewDbQuery<OneStringRow>(`SELECT whatsapp AS value FROM hr_employees WHERE id = ? LIMIT 1`, [id]).catch(() => []),
      runReviewDbQuery<OneStringRow>(`SELECT email_corporate AS value FROM hr_employees WHERE id = ? LIMIT 1`, [id]).catch(() => []),
      runReviewDbQuery<OneStringRow>(`SELECT CAST(join_date AS CHAR) AS value FROM hr_employees WHERE id = ? LIMIT 1`, [id]).catch(() => []),
      runReviewDbQuery<OneStringRow>(`SELECT position_name AS value FROM hr_employees WHERE id = ? LIMIT 1`, [id]).catch(() => []),
      core.branchId ? runReviewDbQuery<OneStringRow>(`SELECT name AS value FROM org_branches WHERE id = ? LIMIT 1`, [core.branchId]).catch(() => []) : Promise.resolve([]),
      core.divisionId ? runReviewDbQuery<OneStringRow>(`SELECT name AS value FROM org_divisions WHERE id = ? LIMIT 1`, [core.divisionId]).catch(() => []) : Promise.resolve([]),
      core.teamId ? runReviewDbQuery<OneStringRow>(`SELECT name AS value FROM org_teams WHERE id = ? LIMIT 1`, [core.teamId]).catch(() => []) : Promise.resolve([]),
      core.positionId ? runReviewDbQuery<OneStringRow>(`SELECT name AS value FROM org_positions WHERE id = ? LIMIT 1`, [core.positionId]).catch(() => []) : Promise.resolve([]),
      core.supervisorId ? runReviewDbQuery<SupervisorRow>(`SELECT full_name, employee_code FROM hr_employees WHERE id = ? LIMIT 1`, [core.supervisorId]).catch(() => []) : Promise.resolve([]),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_employee_kpis WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }]),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_loans WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }]),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_disciplinary_records WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }]),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_salary_slips WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }]),
      runReviewDbQuery<CountTotalRow>(
        `SELECT COUNT(*) AS total FROM hr_attendance WHERE employee_id = ? AND attendance_date >= CURRENT_DATE - INTERVAL 30 DAY LIMIT 1`,
        [id],
      ).catch(() => [{ total: 0 }]),
    ])

    const phone = firstCol(rPhone) as string | null
    const whatsapp = firstCol(rWhatsapp) as string | null
    const emailCorporate = firstCol(rEmail) as string | null
    const joinDate = firstCol(rJoinDate) as string | null
    const legacyPosition = firstCol(rLegacyPosition) as string | null
    const branchName = firstCol(rBranchName) as string | null
    const divisionName = firstCol(rDivisionName) as string | null
    const teamName = firstCol(rTeamName) as string | null
    const positionNameRef = firstCol(rPositionName) as string | null
    const supervisorRow = rSupervisor[0] || null
    const supervisorName = supervisorRow ? supervisorRow.full_name || null : null
    const supervisorCode = supervisorRow ? supervisorRow.employee_code || null : null

    const data = {
      id: core.id,
      employeeCode: core.employeeCode,
      fullName: core.fullName,
      branchId: core.branchId,
      branchName,
      divisionId: core.divisionId,
      divisionName,
      teamId: core.teamId,
      teamName,
      positionId: core.positionId,
      positionName: positionNameRef || legacyPosition || null,
      positionLabelLegacy: legacyPosition,
      supervisorId: core.supervisorId,
      supervisorName,
      supervisorCode,
      contractDocId: core.contractDocId,
      contractStartDate: core.contractStartDate,
      contractEndDate: core.contractEndDate,
      exitDate: core.exitDate,
      exitReason: core.exitReason,
      userId: core.userId,
      employmentStatus: core.employmentStatus || 'KARYAWAN',
      employmentType: null,
      baseSalary: core.baseSalary,
      phone,
      whatsapp,
      emailCorporate,
      joinDate,
      status: core.status,
      nickname: null,
      gender: null,
      placeOfBirth: null,
      dateOfBirth: null,
      idNumber: null,
      taxId: null,
      bloodType: null,
      religion: null,
      maritalStatus: null,
      address: null,
      city: null,
      postalCode: null,
      personalEmail: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelation: null,
      bankAccountNumber: null,
      bankName: null,
      bpjsKetenagakerjaan: null,
      bpjsKesehatan: null,
    }

    const summaryRelations = {
      totalKpiRecords: Number(cKpi[0]?.total ?? 0),
      totalLoansRecords: Number(cLoans[0]?.total ?? 0),
      totalDisciplinaryRecords: Number(cDiscipl[0]?.total ?? 0),
      totalSalarySlipsRecords: Number(cSlips[0]?.total ?? 0),
      totalAttendanceRecords30Days: Number(cAtt30d[0]?.total ?? 0),
    }

    return Response.json({ data, summaryRelations })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
