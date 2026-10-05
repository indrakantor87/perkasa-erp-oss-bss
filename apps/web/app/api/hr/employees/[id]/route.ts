import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import {
  ensureHrDisciplinaryRecordsTable,
  parsePositiveInt,
} from '@/lib/services/hr-disciplinary-schema-ensure'
import { ensureHrEmployeeKpiTable } from '@/lib/services/hr-employee-kpi-service'

type EmployeeCoreRow = {
  id: number
  employee_code: string | null
  full_name: string | null
  branch_id: number | null
  division_id: number | null
  team_id: number | null
  position_id: number | null
  supervisor_id: number | null
  position_name: string | null
  employment_status: string | null
  join_date: string | null
  contract_doc_id: number | null
  contract_start_date: string | null
  contract_end_date: string | null
  exit_date: string | null
  exit_reason: string | null
  user_id: number | null
  base_salary: string | number | null
  phone: string | null
  whatsapp: string | null
  email_corporate: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
}

type CountTotalRow = { total: number }

type NameRow = { name: string | null; employee_code?: string | null; full_name?: string | null }

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
    if (!id) return Response.json({ message: 'id karyawan tidak valid (harus integer positif).' }, { status: 400 })

    const coreRows = await runReviewDbQuery<EmployeeCoreRow>(
      `
      SELECT
        id,
        employee_code,
        full_name,
        branch_id,
        division_id,
        team_id,
        position_id,
        supervisor_id,
        position_name,
        employment_status,
        CAST(join_date AS CHAR) AS join_date,
        contract_doc_id,
        CAST(contract_start_date AS CHAR) AS contract_start_date,
        CAST(contract_end_date AS CHAR) AS contract_end_date,
        CAST(exit_date AS CHAR) AS exit_date,
        exit_reason,
        user_id,
        base_salary,
        phone,
        whatsapp,
        email_corporate,
        status,
        CAST(created_at AS CHAR) AS created_at,
        CAST(updated_at AS CHAR) AS updated_at
      FROM hr_employees
      WHERE id = ?
      LIMIT 1
    `,
      [id],
    )

    if (coreRows.length === 0) {
      return Response.json({ message: `Karyawan dengan id=${id} tidak ditemukan di hr_employees.` }, { status: 404 })
    }
    const core = coreRows[0]

    const [branchRows, divisionRows, teamRows, positionRows, supervisorRows, kpiCount, loansCount, disciplinaryCount, slipsCount, attendanceCount30d] =
      await Promise.all([
        core.branch_id ? runReviewDbQuery<NameRow>(`SELECT name FROM org_branches WHERE id = ? LIMIT 1`, [core.branch_id]).catch(() => []) : Promise.resolve([] as NameRow[]),
        core.division_id ? runReviewDbQuery<NameRow>(`SELECT name FROM org_divisions WHERE id = ? LIMIT 1`, [core.division_id]).catch(() => []) : Promise.resolve([] as NameRow[]),
        core.team_id ? runReviewDbQuery<NameRow>(`SELECT name FROM org_teams WHERE id = ? LIMIT 1`, [core.team_id]).catch(() => []) : Promise.resolve([] as NameRow[]),
        core.position_id ? runReviewDbQuery<NameRow>(`SELECT name FROM org_positions WHERE id = ? LIMIT 1`, [core.position_id]).catch(() => []) : Promise.resolve([] as NameRow[]),
        core.supervisor_id ? runReviewDbQuery<NameRow>(`SELECT employee_code, full_name FROM hr_employees WHERE id = ? LIMIT 1`, [core.supervisor_id]).catch(() => []) : Promise.resolve([] as NameRow[]),
        runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_employee_kpis WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }] as CountTotalRow[]),
        runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_loans WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }] as CountTotalRow[]),
        runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_disciplinary_records WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }] as CountTotalRow[]),
        runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_salary_slips WHERE employee_id = ? LIMIT 1`, [id]).catch(() => [{ total: 0 }] as CountTotalRow[]),
        runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_attendance WHERE employee_id = ? AND attendance_date >= CURRENT_DATE - INTERVAL 30 DAY LIMIT 1`, [id]).catch(() => [{ total: 0 }] as CountTotalRow[]),
      ])

    const data = {
      id: core.id,
      employeeCode: core.employee_code,
      fullName: core.full_name,
      branchId: core.branch_id,
      branchName: branchRows[0]?.name ?? null,
      divisionId: core.division_id,
      divisionName: divisionRows[0]?.name ?? null,
      teamId: core.team_id,
      teamName: teamRows[0]?.name ?? null,
      positionId: core.position_id,
      positionName: positionRows[0]?.name ?? core.position_name ?? null,
      positionLabelLegacy: core.position_name,
      supervisorId: core.supervisor_id,
      supervisorName: supervisorRows[0]?.full_name ?? null,
      supervisorCode: supervisorRows[0]?.employee_code ?? null,
      contractDocId: core.contract_doc_id,
      contractStartDate: core.contract_start_date,
      contractEndDate: core.contract_end_date,
      exitDate: core.exit_date,
      exitReason: core.exit_reason,
      userId: core.user_id,
      employmentStatus: core.employment_status || 'KARYAWAN',
      employmentType: null,
      baseSalary: core.base_salary,
      phone: core.phone,
      whatsapp: core.whatsapp,
      emailCorporate: core.email_corporate,
      joinDate: core.join_date,
      status: core.status,
      createdAt: core.created_at,
      updatedAt: core.updated_at,
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
      totalKpiRecords: Number(kpiCount[0]?.total ?? 0),
      totalLoansRecords: Number(loansCount[0]?.total ?? 0),
      totalDisciplinaryRecords: Number(disciplinaryCount[0]?.total ?? 0),
      totalSalarySlipsRecords: Number(slipsCount[0]?.total ?? 0),
      totalAttendanceRecords30Days: Number(attendanceCount30d[0]?.total ?? 0),
    }

    return Response.json({ data, summaryRelations })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
