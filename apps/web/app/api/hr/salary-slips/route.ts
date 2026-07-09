import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrSalarySlipVoidTable } from '@/lib/services/hr-salary-slip-void-service'

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
  baseSalary: number
}

type ExistingSalarySlipRow = {
  id: number
}

type SalarySlipRow = {
  id: number
  employeeCode: string
  fullName: string
  payrollMonth: number
  payrollYear: number
  releasedAt: string | null
  voidedAt: string | null
}

type LoanDeductionRow = {
  loanDeduction: number | null
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeRequiredPrice(value: unknown) {
  const parsed = normalizePrice(value)
  return parsed === null ? 0 : parsed
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
      { message: 'Write action payroll HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      employeeCode?: unknown
      payrollMonth?: unknown
      payrollYear?: unknown
      baseSalary?: unknown
      attendanceAllowance?: unknown
      overtimeAmount?: unknown
      performanceBonus?: unknown
      positionAllowance?: unknown
      loanDeduction?: unknown
      releasedAt?: unknown
    }

    const employeeCode = String(payload.employeeCode ?? '').trim()
    const payrollMonth = Number.parseInt(String(payload.payrollMonth ?? '').trim() || '0', 10)
    const payrollYear = Number.parseInt(String(payload.payrollYear ?? '').trim() || '0', 10)
    const baseSalaryInput = normalizePrice(payload.baseSalary)
    const attendanceAllowance = normalizeRequiredPrice(payload.attendanceAllowance)
    const overtimeAmount = normalizeRequiredPrice(payload.overtimeAmount)
    const performanceBonus = normalizeRequiredPrice(payload.performanceBonus)
    const positionAllowance = normalizeRequiredPrice(payload.positionAllowance)
    const loanDeductionInput = normalizePrice(payload.loanDeduction)
    const releasedAtRaw = String(payload.releasedAt ?? '').trim()

    if (!employeeCode) {
      return Response.json({ message: 'Employee HR wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(payrollMonth) || payrollMonth < 1 || payrollMonth > 12) {
      return Response.json({ message: 'Bulan payroll tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(payrollYear) || payrollYear < 2020 || payrollYear > 2100) {
      return Response.json({ message: 'Tahun payroll tidak valid.' }, { status: 400 })
    }

    const [employee] = await runReviewDbQuery<EmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          full_name AS fullName,
          base_salary AS baseSalary
        FROM hr_employees
        WHERE UPPER(employee_code) = UPPER(?)
        LIMIT 1
      `,
      [employeeCode],
    )
    if (!employee) {
      return Response.json({ message: 'Employee HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const existing = await runReviewDbQuery<ExistingSalarySlipRow>(
      `
        SELECT id
        FROM hr_salary_slips
        WHERE employee_id = ?
          AND payroll_month = ?
          AND payroll_year = ?
        LIMIT 1
      `,
      [employee.id, payrollMonth, payrollYear],
    )
    if (existing.length > 0) {
      return Response.json({ message: 'Slip gaji untuk employee dan periode tersebut sudah ada.' }, { status: 409 })
    }

    const [loanDeductionRow] = await runReviewDbQuery<LoanDeductionRow>(
      `
        SELECT COALESCE(SUM(monthly_installment), 0) AS loanDeduction
        FROM hr_loans
        WHERE employee_id = ?
          AND status = 'ACTIVE'
      `,
      [employee.id],
    )

    const baseSalary = baseSalaryInput ?? Number(employee.baseSalary ?? 0)
    const loanDeduction = loanDeductionInput ?? Number(loanDeductionRow?.loanDeduction ?? 0)

    if (baseSalary < 0 || attendanceAllowance < 0 || overtimeAmount < 0 || performanceBonus < 0 || positionAllowance < 0 || loanDeduction < 0) {
      return Response.json({ message: 'Komponen payroll tidak valid.' }, { status: 400 })
    }

    const totalIncome = baseSalary + attendanceAllowance + overtimeAmount + performanceBonus + positionAllowance
    const totalDeduction = loanDeduction
    const netSalary = totalIncome - totalDeduction
    if (netSalary < 0) {
      return Response.json({ message: 'Net salary tidak boleh negatif.' }, { status: 400 })
    }

    if (releasedAtRaw) {
      const releasedAt = new Date(releasedAtRaw)
      if (!Number.isFinite(releasedAt.getTime())) {
        return Response.json({ message: 'Waktu release slip gaji tidak valid.' }, { status: 400 })
      }
    }

    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_salary_slips (
          employee_id,
          payroll_month,
          payroll_year,
          base_salary,
          attendance_allowance,
          overtime_amount,
          performance_bonus,
          position_allowance,
          loan_deduction,
          total_income,
          total_deduction,
          net_salary,
          released_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employee.id,
        payrollMonth,
        payrollYear,
        baseSalary,
        attendanceAllowance,
        overtimeAmount,
        performanceBonus,
        positionAllowance,
        loanDeduction,
        totalIncome,
        totalDeduction,
        netSalary,
        releasedAtRaw || null,
      ],
    )

    await recordHrAudit({
      actionType: 'SALARY_SLIP_CREATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `${employee.employeeCode}:${payrollMonth}/${payrollYear}`,
      detail: `Slip gaji ${employee.employeeCode} - ${employee.fullName} periode ${payrollMonth}/${payrollYear} dibuat via web dengan net salary Rp ${netSalary.toLocaleString('id-ID')}.`,
    })

    return Response.json({
      message: `Slip gaji ${employee.employeeCode} - ${employee.fullName} periode ${payrollMonth}/${payrollYear} berhasil disimpan.`,
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
      { message: 'Release slip gaji hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      salarySlipId?: unknown
      releasedAt?: unknown
      notes?: unknown
    }

    const salarySlipId = Number.parseInt(String(payload.salarySlipId ?? '').trim(), 10)
    const releasedAtRaw = String(payload.releasedAt ?? '').trim()
    const notes = String(payload.notes ?? '').trim()

    if (!Number.isInteger(salarySlipId) || salarySlipId <= 0) {
      return Response.json({ message: 'Slip gaji HR tidak valid.' }, { status: 400 })
    }

    await ensureHrSalarySlipVoidTable()

    const releaseTime = releasedAtRaw || new Date().toISOString().slice(0, 19).replace('T', ' ')
    const releaseDate = new Date(releaseTime.replace(' ', 'T'))
    if (!Number.isFinite(releaseDate.getTime())) {
      return Response.json({ message: 'Waktu release slip gaji tidak valid.' }, { status: 400 })
    }

    const [salarySlip] = await runReviewDbQuery<SalarySlipRow>(
      `
        SELECT
          hss.id,
          he.employee_code AS employeeCode,
          he.full_name AS fullName,
          hss.payroll_month AS payrollMonth,
          hss.payroll_year AS payrollYear,
          CAST(hss.released_at AS CHAR) AS releasedAt,
          CAST(hsv.voided_at AS CHAR) AS voidedAt
        FROM hr_salary_slips hss
        JOIN hr_employees he
          ON he.id = hss.employee_id
        LEFT JOIN hr_salary_slip_voids hsv
          ON hsv.salary_slip_id = hss.id
        WHERE hss.id = ?
        LIMIT 1
      `,
      [salarySlipId],
    )
    if (!salarySlip) {
      return Response.json({ message: 'Slip gaji HR tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (salarySlip.releasedAt) {
      return Response.json({ message: 'Slip gaji ini sudah berstatus released.' }, { status: 409 })
    }
    if (salarySlip.voidedAt) {
      return Response.json({ message: 'Slip gaji yang sudah di-void tidak bisa dirilis kembali.' }, { status: 409 })
    }

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_salary_slips
        SET
          released_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [releaseTime, salarySlip.id],
    )

    await recordHrAudit({
      actionType: 'SALARY_SLIP_RELEASE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `PAYROLL-${salarySlip.id}`,
      detail: `Slip gaji ${salarySlip.employeeCode} - ${salarySlip.fullName} periode ${String(salarySlip.payrollMonth).padStart(2, '0')}/${salarySlip.payrollYear} dirilis via web${notes ? ` (${notes})` : ''}.`,
    })

    return Response.json({
      message: `Slip gaji ${salarySlip.employeeCode} - ${salarySlip.fullName} periode ${salarySlip.payrollMonth}/${salarySlip.payrollYear} berhasil dirilis.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
