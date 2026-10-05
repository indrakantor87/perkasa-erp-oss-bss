import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import {
  ensureHrDisciplinaryRecordsTable,
  parsePositiveInt,
} from '@/lib/services/hr-disciplinary-schema-ensure'
import { ensureHrEmployeeKpiTable } from '@/lib/services/hr-employee-kpi-service'

type EmployeeDetailRow = {
  id: number
  employeeCode: string
  fullName: string
  branchId: number | null
  branchName: string | null
  divisionId: number | null
  divisionName: string | null
  teamId: number | null
  teamName: string | null
  positionId: number | null
  positionName: string | null
  positionLabelLegacy: string | null
  supervisorId: number | null
  supervisorName: string | null
  supervisorCode: string | null
  contractDocId: number | null
  contractStartDate: string | null
  contractEndDate: string | null
  exitDate: string | null
  exitReason: string | null
  userId: number | null
  employmentStatus: string
  baseSalary: string | number | null
  phone: string | null
  whatsapp: string | null
  emailCorporate: string | null
  joinDate: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  employmentType: string | null
  nickname: string | null
  gender: string | null
  placeOfBirth: string | null
  dateOfBirth: string | null
  idNumber: string | null
  taxId: string | null
  bloodType: string | null
  religion: string | null
  maritalStatus: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  personalEmail: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  bankAccountNumber: string | null
  bankName: string | null
  bpjsKetenagakerjaan: string | null
  bpjsKesehatan: string | null
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
    if (!id) return Response.json({ message: 'id karyawan tidak valid (harus integer positif).' }, { status: 400 })

    const employees = await runReviewDbQuery<EmployeeDetailRow>(
      `
      SELECT
        he.id AS id,
        he.employee_code AS employeeCode,
        he.full_name AS fullName,
        he.branch_id AS branchId,
        ob.name AS branchName,
        he.division_id AS divisionId,
        od.name AS divisionName,
        he.team_id AS teamId,
        ot.name AS teamName,
        he.position_id AS positionId,
        op.name AS positionName,
        he.position_name AS positionLabelLegacy,
        he.supervisor_id AS supervisorId,
        sup.full_name AS supervisorName,
        sup.employee_code AS supervisorCode,
        he.contract_doc_id AS contractDocId,
        CAST(he.contract_start_date AS CHAR) AS contractStartDate,
        CAST(he.contract_end_date AS CHAR) AS contractEndDate,
        CAST(he.exit_date AS CHAR) AS exitDate,
        he.exit_reason AS exitReason,
        he.user_id AS userId,
        COALESCE(NULLIF(TRIM(he.employment_status), ''), 'KARYAWAN') AS employmentStatus,
        he.base_salary AS baseSalary,
        he.phone AS phone,
        he.whatsapp AS whatsapp,
        he.email_corporate AS emailCorporate,
        CAST(he.join_date AS CHAR) AS joinDate,
        he.status AS status,
        CAST(he.created_at AS CHAR) AS createdAt,
        CAST(he.updated_at AS CHAR) AS updatedAt,
        NULL AS employmentType,
        NULL AS nickname,
        NULL AS gender,
        NULL AS placeOfBirth,
        NULL AS dateOfBirth,
        NULL AS idNumber,
        NULL AS taxId,
        NULL AS bloodType,
        NULL AS religion,
        NULL AS maritalStatus,
        NULL AS address,
        NULL AS city,
        NULL AS postalCode,
        NULL AS personalEmail,
        NULL AS emergencyContactName,
        NULL AS emergencyContactPhone,
        NULL AS emergencyContactRelation,
        NULL AS bankAccountNumber,
        NULL AS bankName,
        NULL AS bpjsKetenagakerjaan,
        NULL AS bpjsKesehatan
      FROM hr_employees he
      LEFT JOIN org_branches ob ON ob.id = he.branch_id
      LEFT JOIN org_divisions od ON od.id = he.division_id
      LEFT JOIN org_teams ot ON ot.id = he.team_id
      LEFT JOIN org_positions op ON op.id = he.position_id
      LEFT JOIN hr_employees sup ON sup.id = he.supervisor_id
      WHERE he.id = ?
      LIMIT 1
    `,
      [id],
    )

    if (employees.length === 0) {
      return Response.json({ message: `Karyawan dengan id=${id} tidak ditemukan di hr_employees.` }, { status: 404 })
    }
    const data = employees[0]

    const countPromises: Array<Promise<CountTotalRow[]>> = [
      runReviewDbQuery<CountTotalRow>(
        `SELECT COUNT(*) AS total FROM hr_employee_kpis WHERE employee_id = ? LIMIT 1`,
        [id],
      ).catch(() => [{ total: 0 }] as CountTotalRow[]),
      runReviewDbQuery<CountTotalRow>(
        `SELECT COUNT(*) AS total FROM hr_loans WHERE employee_id = ? LIMIT 1`,
        [id],
      ).catch(() => [{ total: 0 }] as CountTotalRow[]),
      runReviewDbQuery<CountTotalRow>(
        `SELECT COUNT(*) AS total FROM hr_disciplinary_records WHERE employee_id = ? LIMIT 1`,
        [id],
      ).catch(() => [{ total: 0 }] as CountTotalRow[]),
      runReviewDbQuery<CountTotalRow>(
        `SELECT COUNT(*) AS total FROM hr_salary_slips WHERE employee_id = ? LIMIT 1`,
        [id],
      ).catch(() => [{ total: 0 }] as CountTotalRow[]),
      runReviewDbQuery<CountTotalRow>(
        `
          SELECT COUNT(*) AS total
          FROM hr_attendance
          WHERE employee_id = ?
            AND attendance_date >= CURRENT_DATE - INTERVAL 30 DAY
          LIMIT 1
        `,
        [id],
      ).catch(() => [{ total: 0 }] as CountTotalRow[]),
    ]

    const [kpiCount, loansCount, disciplinaryCount, slipsCount, attendanceCount30d] = await Promise.all(countPromises)

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
