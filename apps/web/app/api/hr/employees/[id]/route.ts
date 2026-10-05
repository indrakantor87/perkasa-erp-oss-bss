import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
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
  phone: string | null
  email: string | null
  personalEmail: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  branchId: number | null
  branchName: string | null
  divisionId: number | null
  divisionName: string | null
  teamId: number | null
  teamName: string | null
  positionId: number | null
  positionName: string | null
  supervisorId: number | null
  supervisorName: string | null
  supervisorCode: string | null
  userId: number | null
  employmentStatus: string
  baseSalary: string | number | null
  employmentType: string | null
  joinDate: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  exitDate: string | null
  exitReason: string | null
  bankAccountNumber: string | null
  bankName: string | null
  bpjsKetenagakerjaan: string | null
  bpjsKesehatan: string | null
  contractDocId: number | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
}

type CountTotalRow = { total: number }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })
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
        he.nickname AS nickname,
        he.gender AS gender,
        he.place_of_birth AS placeOfBirth,
        CAST(he.date_of_birth AS CHAR) AS dateOfBirth,
        he.id_number AS idNumber,
        he.tax_id AS taxId,
        he.blood_type AS bloodType,
        he.religion AS religion,
        he.marital_status AS maritalStatus,
        he.address AS address,
        he.city AS city,
        he.postal_code AS postalCode,
        he.phone AS phone,
        he.email AS email,
        he.personal_email AS personalEmail,
        he.emergency_contact_name AS emergencyContactName,
        he.emergency_contact_phone AS emergencyContactPhone,
        he.emergency_contact_relation AS emergencyContactRelation,
        he.branch_id AS branchId,
        ob.name AS branchName,
        he.division_id AS divisionId,
        od.name AS divisionName,
        he.team_id AS teamId,
        ot.name AS teamName,
        he.position_id AS positionId,
        op.name AS positionName,
        he.supervisor_id AS supervisorId,
        sup.full_name AS supervisorName,
        sup.employee_code AS supervisorCode,
        he.user_id AS userId,
        he.employment_status AS employmentStatus,
        CAST(he.base_salary AS CHAR) AS baseSalary,
        he.employment_type AS employmentType,
        CAST(he.join_date AS CHAR) AS joinDate,
        CAST(he.contract_start_date AS CHAR) AS contractStartDate,
        CAST(he.contract_end_date AS CHAR) AS contractEndDate,
        CAST(he.exit_date AS CHAR) AS exitDate,
        he.exit_reason AS exitReason,
        he.bank_account_number AS bankAccountNumber,
        he.bank_name AS bankName,
        he.bpjs_ketenagakerjaan AS bpjsKetenagakerjaan,
        he.bpjs_kesehatan AS bpjsKesehatan,
        he.contract_doc_id AS contractDocId,
        he.status AS status,
        CAST(he.created_at AS CHAR) AS createdAt,
        CAST(he.updated_at AS CHAR) AS updatedAt
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

  const [kpiCount, loansCount, disciplinaryCount, slipsCount, attendanceCount30d] = await Promise.all([
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
  ])

  const summaryRelations = {
    totalKpiRecords: Number(kpiCount[0]?.total ?? 0),
    totalLoansRecords: Number(loansCount[0]?.total ?? 0),
    totalDisciplinaryRecords: Number(disciplinaryCount[0]?.total ?? 0),
    totalSalarySlipsRecords: Number(slipsCount[0]?.total ?? 0),
    totalAttendanceRecords30Days: Number(attendanceCount30d[0]?.total ?? 0),
  }

  return Response.json({ data, summaryRelations })
}
