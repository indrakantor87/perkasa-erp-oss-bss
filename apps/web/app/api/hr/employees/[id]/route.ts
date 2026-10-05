import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import {
  ensureHrDisciplinaryRecordsTable,
  parsePositiveInt,
} from '@/lib/services/hr-disciplinary-schema-ensure'
import { ensureHrEmployeeKpiTable } from '@/lib/services/hr-employee-kpi-service'

type MinimalIdentRow = {
  id: number
  employeeCode: string | null
  fullName: string | null
  divisionName: string | null
}

type CountTotalRow = { total: number }

function scalar(rows: unknown, fallback: unknown = null) {
  if (!rows || !Array.isArray(rows) || !rows.length) return fallback
  const r: any = rows[0]
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
    if (!id) return Response.json({ message: 'id karyawan tidak valid (integer positif).' }, { status: 400 })

    await runReviewDbQuery<any>(
      `
      SELECT he.id
      FROM hr_disciplinary_records hdr
      JOIN hr_employees he
        ON he.id = hdr.employee_id
      LEFT JOIN org_divisions od
        ON od.id = he.division_id
      WHERE hdr.id IN (SELECT MIN(ih.id) FROM hr_disciplinary_records ih)
      LIMIT 1
    `,
      [],
    ).catch(() => [])

    let identRows: MinimalIdentRow[] = []
    try {
      identRows = await runReviewDbQuery<MinimalIdentRow>(
        `
        SELECT
          he.id AS id,
          he.employee_code AS employeeCode,
          he.full_name AS fullName,
          od.name AS divisionName
        FROM hr_disciplinary_records hdr
        JOIN hr_employees he
          ON he.id = hdr.employee_id
        LEFT JOIN org_divisions od
          ON od.id = he.division_id
        WHERE hdr.id = (SELECT MIN(ihdr.id) FROM hr_disciplinary_records ihdr WHERE ihdr.employee_id = ? LIMIT 1)
        LIMIT 1
      `,
        [id],
      )
    } catch (_) {
      identRows = []
    }

    if (!identRows.length) {
      try {
        identRows = await runReviewDbQuery<MinimalIdentRow>(
          `
          SELECT
            he.id AS id,
            he.employee_code AS employeeCode,
            he.full_name AS fullName,
            NULL AS divisionName
          FROM hr_employees he
          WHERE he.id = ?
          LIMIT 1
        `,
          [id],
        )
      } catch (_) {
        identRows = []
      }
    }

    const core = identRows[0] || null
    if (!core) {
      return Response.json({ message: `Karyawan id=${id} tidak ditemukan.` }, { status: 404 })
    }

    const Q = (sql: string, values: unknown[] = []) =>
      runReviewDbQuery<any>(sql, values).catch(() => [])

    const [
      r_branch_id,
      r_division_id,
      r_team_id,
      r_position_id,
      r_supervisor_id,
      r_contract_doc_id,
      r_contract_start,
      r_contract_end,
      r_exit_date,
      r_exit_reason,
      r_user_id,
      r_employment_status,
      r_base_salary,
      r_phone,
      r_whatsapp,
      r_email_corp,
      r_join_date,
      r_position_name,
      r_status,
      c_kpi,
      c_loans,
      c_discipl,
      c_slips,
      c_att30,
    ] = await Promise.all([
      Q(`SELECT branch_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT division_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT team_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT position_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT supervisor_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT contract_doc_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT CAST(contract_start_date AS CHAR) FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT CAST(contract_end_date AS CHAR) FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT CAST(exit_date AS CHAR) FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT exit_reason FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT user_id FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT employment_status FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT base_salary FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT phone FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT whatsapp FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT email_corporate FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT CAST(join_date AS CHAR) FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT position_name FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT status FROM hr_employees WHERE id = ? LIMIT 1`, [id]),
      Q(`SELECT COUNT(*) AS total FROM hr_employee_kpis WHERE employee_id = ? LIMIT 1`, [id]),
      Q(`SELECT COUNT(*) AS total FROM hr_loans WHERE employee_id = ? LIMIT 1`, [id]),
      Q(`SELECT COUNT(*) AS total FROM hr_disciplinary_records WHERE employee_id = ? LIMIT 1`, [id]),
      Q(`SELECT COUNT(*) AS total FROM hr_salary_slips WHERE employee_id = ? LIMIT 1`, [id]),
      Q(`SELECT COUNT(*) AS total FROM hr_attendance WHERE employee_id = ? AND attendance_date >= CURRENT_DATE - INTERVAL 30 DAY LIMIT 1`, [id]),
    ])

    const branchId = scalar(r_branch_id, null) as number | null
    const divisionId = scalar(r_division_id, null) as number | null
    const teamId = scalar(r_team_id, null) as number | null
    const positionId = scalar(r_position_id, null) as number | null
    const supervisorId = scalar(r_supervisor_id, null) as number | null

    const [r_branch_name, r_division_name2, r_team_name, r_position_name_ref, r_supervisor] = await Promise.all([
      branchId != null ? Q(`SELECT name FROM org_branches WHERE id = ? LIMIT 1`, [Number(branchId) || 0]) : Promise.resolve([]),
      divisionId != null ? Q(`SELECT name FROM org_divisions WHERE id = ? LIMIT 1`, [Number(divisionId) || 0]) : Promise.resolve([]),
      teamId != null ? Q(`SELECT name FROM org_teams WHERE id = ? LIMIT 1`, [Number(teamId) || 0]) : Promise.resolve([]),
      positionId != null ? Q(`SELECT name FROM org_positions WHERE id = ? LIMIT 1`, [Number(positionId) || 0]) : Promise.resolve([]),
      supervisorId != null ? Q(`SELECT full_name, employee_code FROM hr_employees WHERE id = ? LIMIT 1`, [Number(supervisorId) || 0]) : Promise.resolve([]),
    ])

    const positionLabelLegacy = scalar(r_position_name, null) as string | null
    const positionName = scalar(r_position_name_ref, null) as string | null || positionLabelLegacy || null
    const supervisorRow: any = Array.isArray(r_supervisor) && r_supervisor.length ? r_supervisor[0] : null
    const supervisorName = supervisorRow && typeof supervisorRow === 'object' ? (supervisorRow.full_name || null) : null
    const supervisorCode = supervisorRow && typeof supervisorRow === 'object' ? (supervisorRow.employee_code || null) : null

    const data = {
      id: core.id,
      employeeCode: core.employeeCode,
      fullName: core.fullName,
      branchId,
      branchName: scalar(r_branch_name, null) as string | null,
      divisionId,
      divisionName: (scalar(r_division_name2, null) as string | null) || core.divisionName || null,
      teamId,
      teamName: scalar(r_team_name, null) as string | null,
      positionId,
      positionName,
      positionLabelLegacy,
      supervisorId,
      supervisorName,
      supervisorCode,
      contractDocId: scalar(r_contract_doc_id, null) as number | null,
      contractStartDate: scalar(r_contract_start, null) as string | null,
      contractEndDate: scalar(r_contract_end, null) as string | null,
      exitDate: scalar(r_exit_date, null) as string | null,
      exitReason: scalar(r_exit_reason, null) as string | null,
      userId: scalar(r_user_id, null) as number | null,
      employmentStatus: (scalar(r_employment_status, null) as string | null) || 'KARYAWAN',
      employmentType: null,
      baseSalary: scalar(r_base_salary, null) as number | string | null,
      phone: scalar(r_phone, null) as string | null,
      whatsapp: scalar(r_whatsapp, null) as string | null,
      emailCorporate: scalar(r_email_corp, null) as string | null,
      joinDate: scalar(r_join_date, null) as string | null,
      status: scalar(r_status, null) as string | null,
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
      totalKpiRecords: Number(scalar(c_kpi, 0)),
      totalLoansRecords: Number(scalar(c_loans, 0)),
      totalDisciplinaryRecords: Number(scalar(c_discipl, 0)),
      totalSalarySlipsRecords: Number(scalar(c_slips, 0)),
      totalAttendanceRecords30Days: Number(scalar(c_att30, 0)),
    }

    return Response.json({ data, summaryRelations })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
