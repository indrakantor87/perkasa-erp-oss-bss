import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

const allowedStatuses = new Set(['PENDING', 'ACTIVE', 'REJECTED', 'PAID', 'CANCELLED'])

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
}

type LoanRow = {
  id: number
  employeeCode: string
  fullName: string
  loanType: string
  loanDate: string
  status: string
  description: string | null
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

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
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
      { message: 'Write action loan HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      employeeCode?: unknown
      loanType?: unknown
      amount?: unknown
      monthlyInstallment?: unknown
      loanDate?: unknown
      status?: unknown
      description?: unknown
    }

    const employeeCode = String(payload.employeeCode ?? '').trim()
    const loanType = String(payload.loanType ?? '').trim() || 'KASBON'
    const amount = normalizePrice(payload.amount)
    const monthlyInstallmentRaw = String(payload.monthlyInstallment ?? '').trim()
    const monthlyInstallment = monthlyInstallmentRaw ? normalizePrice(payload.monthlyInstallment) : 0
    const loanDateRaw = String(payload.loanDate ?? '').trim()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const description = String(payload.description ?? '').trim()

    if (!employeeCode) {
      return Response.json({ message: 'Employee HR wajib dipilih.' }, { status: 400 })
    }
    if (!loanType) {
      return Response.json({ message: 'Tipe loan wajib diisi.' }, { status: 400 })
    }
    if (amount === null || amount <= 0) {
      return Response.json({ message: 'Jumlah pinjaman tidak valid.' }, { status: 400 })
    }
    if (monthlyInstallment === null || monthlyInstallment < 0) {
      return Response.json({ message: 'Cicilan bulanan tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status loan tidak valid.' }, { status: 400 })
    }

    const [employee] = await runReviewDbQuery<EmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          full_name AS fullName
        FROM hr_employees
        WHERE UPPER(employee_code) = UPPER(?)
        LIMIT 1
      `,
      [employeeCode],
    )
    if (!employee) {
      return Response.json({ message: 'Employee HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const loanDate = loanDateRaw ? new Date(loanDateRaw) : new Date()
    if (!Number.isFinite(loanDate.getTime())) {
      return Response.json({ message: 'Tanggal loan tidak valid.' }, { status: 400 })
    }
    const loanDateValue = toDateString(loanDate)

    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_loans (
          employee_id,
          loan_type,
          amount,
          monthly_installment,
          description,
          loan_date,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [employee.id, loanType, amount, monthlyInstallment, description || null, loanDateValue, status],
    )

    await recordHrAudit({
      actionType: 'LOAN_CREATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `${employee.employeeCode}:${loanType}:${loanDateValue}`,
      detail: `Loan ${loanType} untuk ${employee.employeeCode} - ${employee.fullName} dibuat via web dengan nilai Rp ${amount.toLocaleString('id-ID')}.`,
    })

    return Response.json({
      message: `Loan ${loanType} untuk ${employee.employeeCode} - ${employee.fullName} berhasil disimpan.`,
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
      { message: 'Update status loan HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      loanId?: unknown
      nextStatus?: unknown
      notes?: unknown
    }

    const loanId = Number.parseInt(String(payload.loanId ?? '').trim(), 10)
    const nextStatus = String(payload.nextStatus ?? '').trim().toUpperCase()
    const notes = String(payload.notes ?? '').trim()

    if (!Number.isInteger(loanId) || loanId <= 0) {
      return Response.json({ message: 'Loan HR tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(nextStatus)) {
      return Response.json({ message: 'Status loan tidak valid.' }, { status: 400 })
    }
    if (nextStatus === 'REJECTED' && !notes) {
      return Response.json({ message: 'Catatan wajib diisi saat loan ditolak.' }, { status: 400 })
    }

    const [loan] = await runReviewDbQuery<LoanRow>(
      `
        SELECT
          hl.id,
          he.employee_code AS employeeCode,
          he.full_name AS fullName,
          hl.loan_type AS loanType,
          CAST(hl.loan_date AS CHAR) AS loanDate,
          hl.status,
          hl.description
        FROM hr_loans hl
        JOIN hr_employees he
          ON he.id = hl.employee_id
        WHERE hl.id = ?
        LIMIT 1
      `,
      [loanId],
    )
    if (!loan) {
      return Response.json({ message: 'Loan HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const currentStatus = String(loan.status ?? '').trim().toUpperCase()
    if (currentStatus === nextStatus) {
      return Response.json({ message: `Loan HR ini sudah berstatus ${nextStatus}.` }, { status: 409 })
    }

    const appendedNote = `[Loan Update] ${session.displayName} (${session.username}) -> ${nextStatus}${notes ? ` - ${notes}` : ''}`
    const mergedDescription = [loan.description?.trim(), appendedNote].filter(Boolean).join('\n')

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_loans
        SET
          status = ?,
          description = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextStatus, mergedDescription || null, loan.id],
    )

    await recordHrAudit({
      actionType: 'LOAN_UPDATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `LOAN-${loan.id}`,
      detail: `Status loan ${loan.loanType} untuk ${loan.employeeCode} - ${loan.fullName} diubah dari ${currentStatus} ke ${nextStatus}${notes ? ` (${notes})` : ''}.`,
    })

    return Response.json({
      message: `Loan ${loan.loanType} untuk ${loan.employeeCode} - ${loan.fullName} berhasil diubah ke ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
