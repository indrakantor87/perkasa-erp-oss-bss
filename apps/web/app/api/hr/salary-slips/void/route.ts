import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrSalarySlipVoidTable } from '@/lib/services/hr-salary-slip-void-service'

type SalarySlipRow = {
  id: number
  employeeCode: string
  fullName: string
  payrollMonth: number
  payrollYear: number
  releasedAt: string | null
}

type ExistingVoidRow = {
  id: number
}

type ExecuteResult = {
  affectedRows?: number
}

export async function POST(request: Request) {
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
      { message: 'Void slip gaji hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      salarySlipId?: unknown
      reason?: unknown
    }

    const salarySlipId = Number.parseInt(String(payload.salarySlipId ?? '').trim(), 10)
    const reason = String(payload.reason ?? '').trim()

    if (!Number.isInteger(salarySlipId) || salarySlipId <= 0) {
      return Response.json({ message: 'Slip gaji HR tidak valid.' }, { status: 400 })
    }
    if (!reason) {
      return Response.json({ message: 'Alasan void slip gaji wajib diisi.' }, { status: 400 })
    }

    await ensureHrSalarySlipVoidTable()

    const [salarySlip] = await runReviewDbQuery<SalarySlipRow>(
      `
        SELECT
          hss.id,
          he.employee_code AS employeeCode,
          he.full_name AS fullName,
          hss.payroll_month AS payrollMonth,
          hss.payroll_year AS payrollYear,
          CAST(hss.released_at AS CHAR) AS releasedAt
        FROM hr_salary_slips hss
        JOIN hr_employees he
          ON he.id = hss.employee_id
        WHERE hss.id = ?
        LIMIT 1
      `,
      [salarySlipId],
    )
    if (!salarySlip) {
      return Response.json({ message: 'Slip gaji HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const [existingVoid] = await runReviewDbQuery<ExistingVoidRow>(
      `
        SELECT id
        FROM hr_salary_slip_voids
        WHERE salary_slip_id = ?
        LIMIT 1
      `,
      [salarySlip.id],
    )
    if (existingVoid) {
      return Response.json({ message: 'Slip gaji ini sudah berstatus void.' }, { status: 409 })
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO hr_salary_slip_voids (
          salary_slip_id,
          actor_name,
          reason_text
        )
        VALUES (?, ?, ?)
      `,
      [salarySlip.id, `${session.displayName} (${session.username})`, reason],
    )

    await recordHrAudit({
      actionType: 'SALARY_SLIP_VOID',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `PAYROLL-${salarySlip.id}`,
      detail: `Slip gaji ${salarySlip.employeeCode} - ${salarySlip.fullName} periode ${String(salarySlip.payrollMonth).padStart(2, '0')}/${salarySlip.payrollYear} di-void via web dengan alasan: ${reason}.`,
    })

    return Response.json({
      message: `Slip gaji ${salarySlip.employeeCode} - ${salarySlip.fullName} periode ${salarySlip.payrollMonth}/${salarySlip.payrollYear} berhasil di-void.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
