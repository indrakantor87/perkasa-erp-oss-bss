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
  employeeCode: string | null
  fullName: string | null
  branchId: number | null
  divisionId: number | null
  teamId: number | null
  positionId: number | null
  supervisorId: number | null
  positionLabelLegacy: string | null
  employmentStatus: string | null
  joinDate: string | null
  contractDocId: number | null
  contractStartDate: string | null
  contractEndDate: string | null
  exitDate: string | null
  exitReason: string | null
  userId: number | null
  baseSalary: string | number | null
  phone: string | null
  whatsapp: string | null
  emailCorporate: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  branchName: string | null
  divisionName: string | null
  teamName: string | null
  positionName: string | null
  supervisorName: string | null
  supervisorCode: string | null
}

type CountTotalRow = { total: number }

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

    const primaryRows = await runReviewDbQuery<EmployeeCoreRow>(
      `
      SELECT
        he.id AS id,
        he.employee_code AS employeeCode,
        he.full_name AS fullName,
        he.branch_id AS branchId,
        he.division_id AS divisionId,
        he.team_id AS teamId,
        he.position_id AS positionId,
        he.supervisor_id AS supervisorId,
        he.position_name AS positionLabelLegacy,
        he.employment_status AS employmentStatus,
        CAST(he.join_date AS CHAR) AS joinDate,
        he.contract_doc_id AS contractDocId,
        CAST(he.contract_start_date AS CHAR) AS contractStartDate,
        CAST(he.contract_end_date AS CHAR) AS contractEndDate,
        CAST(he.exit_date AS CHAR) AS exitDate,
        he.exit_reason AS exitReason,
        he.user_id AS userId,
        he.base_salary AS baseSalary,
        he.phone AS phone,
        he.whatsapp AS whatsapp,
        he.email_corporate AS emailCorporate,
        he.status AS status,
        CAST(he.created_at AS CHAR) AS createdAt,
        CAST(he.updated_at AS CHAR) AS updatedAt,
        ob.name AS branchName,
        od.name AS divisionName,
        ot.name AS teamName,
        op.name AS positionName,
        sup.full_name AS supervisorName,
        sup.employee_code AS supervisorCode
      FROM hr_disciplinary_records hdr
      JOIN hr_employees he
        ON he.id = hdr.employee_id
      LEFT JOIN org_branches ob
        ON ob.id = he.branch_id
      LEFT JOIN org_divisions od
        ON od.id = he.division_id
      LEFT JOIN org_teams ot
        ON ot.id = he.team_id
      LEFT JOIN org_positions op
        ON op.id = he.position_id
      LEFT JOIN hr_employees sup
        ON sup.id = he.supervisor_id
      WHERE he.id = ?
      LIMIT 1
    `,
      [id],
    )

    let core = primaryRows[0] || null

    if (!core) {
      const fallbackRows = await runReviewDbQuery<EmployeeCoreRow>(
        `
        SELECT
          he.id AS id,
          he.employee_code AS employeeCode,
          he.full_name AS fullName,
          he.branch_id AS branchId,
          he.division_id AS divisionId,
          he.team_id AS teamId,
          he.position_id AS positionId,
          he.supervisor_id AS supervisorId,
          he.position_name AS positionLabelLegacy,
          he.employment_status AS employmentStatus,
          CAST(he.join_date AS CHAR) AS joinDate,
          he.contract_doc_id AS contractDocId,
          CAST(he.contract_start_date AS CHAR) AS contractStartDate,
          CAST(he.contract_end_date AS CHAR) AS contractEndDate,
          CAST(he.exit_date AS CHAR) AS exitDate,
          he.exit_reason AS exitReason,
          he.user_id AS userId,
          he.base_salary AS baseSalary,
          he.phone AS phone,
          he.whatsapp AS whatsapp,
          he.email_corporate AS emailCorporate,
          he.status AS status,
          CAST(he.created_at AS CHAR) AS createdAt,
          CAST(he.updated_at AS CHAR) AS updatedAt,
          NULL AS branchName,
          NULL AS divisionName,
          NULL AS teamName,
          NULL AS positionName,
          NULL AS supervisorName,
          NULL AS supervisorCode
        FROM hr_employees he
        WHERE he.id = ?
        LIMIT 1
        `,
        [id],
      )
      core = fallbackRows[0] || null
    }

    if (!core) {
      return Response.json({ message: `Karyawan dengan id=${id} tidak ditemukan di hr_employees.` }, { status: 404 })
    }

    const [kpiCount, loansCount, disciplinaryCount, slipsCount, attendanceCount30d] = await Promise.all([
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_employee_kpis WHERE employee_id = ? LIMIT 1`, [id]).catch(
        () => [{ total: 0 }] as CountTotalRow[],
      ),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_loans WHERE employee_id = ? LIMIT 1`, [id]).catch(
        () => [{ total: 0 }] as CountTotalRow[],
      ),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_disciplinary_records WHERE employee_id = ? LIMIT 1`, [id]).catch(
        () => [{ total: 0 }] as CountTotalRow[],
      ),
      runReviewDbQuery<CountTotalRow>(`SELECT COUNT(*) AS total FROM hr_salary_slips WHERE employee_id = ? LIMIT 1`, [id]).catch(
        () => [{ total: 0 }] as CountTotalRow[],
      ),
      runReviewDbQuery<CountTotalRow>(
        `SELECT COUNT(*) AS total FROM hr_attendance WHERE employee_id = ? AND attendance_date >= CURRENT_DATE - INTERVAL 30 DAY LIMIT 1`,
        [id],
      ).catch(() => [{ total: 0 }] as CountTotalRow[]),
    ])

    const data = {
      id: core.id,
      employeeCode: core.employeeCode,
      fullName: core.fullName,
      branchId: core.branchId,
      branchName: core.branchName,
      divisionId: core.divisionId,
      divisionName: core.divisionName,
      teamId: core.teamId,
      teamName: core.teamName,
      positionId: core.positionId,
      positionName: core.positionName || core.positionLabelLegacy,
      positionLabelLegacy: core.positionLabelLegacy,
      supervisorId: core.supervisorId,
      supervisorName: core.supervisorName,
      supervisorCode: core.supervisorCode,
      contractDocId: core.contractDocId,
      contractStartDate: core.contractStartDate,
      contractEndDate: core.contractEndDate,
      exitDate: core.exitDate,
      exitReason: core.exitReason,
      userId: core.userId,
      employmentStatus: core.employmentStatus || 'KARYAWAN',
      employmentType: null,
      baseSalary: core.baseSalary,
      phone: core.phone,
      whatsapp: core.whatsapp,
      emailCorporate: core.emailCorporate,
      joinDate: core.joinDate,
      status: core.status,
      createdAt: core.createdAt,
      updatedAt: core.updatedAt,
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

    return Response.json({ data, summaryRelations, resolvedQuery: core.divisionName !== undefined ? 'primary-DISCPLINARY-JOIN' : 'fallback-hr_employees-direct' })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
