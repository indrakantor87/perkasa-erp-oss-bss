import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

type LoanRow = {
  id: number
  employeeCode: string
  fullName: string
  loanType: string
  loanDate: string
  status: string
  description: string | null
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
      { message: 'Void loan HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      loanId?: unknown
      reason?: unknown
    }

    const loanId = Number.parseInt(String(payload.loanId ?? '').trim(), 10)
    const reason = String(payload.reason ?? '').trim()

    if (!Number.isInteger(loanId) || loanId <= 0) {
      return Response.json({ message: 'Loan HR tidak valid.' }, { status: 400 })
    }
    if (!reason) {
      return Response.json({ message: 'Alasan cancel/void loan wajib diisi.' }, { status: 400 })
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
    if (currentStatus === 'CANCELLED') {
      return Response.json({ message: 'Loan HR ini sudah berstatus CANCELLED.' }, { status: 409 })
    }
    if (currentStatus === 'PAID') {
      return Response.json({ message: 'Loan HR yang sudah PAID tidak bisa di-void.' }, { status: 409 })
    }

    const appendedNote = `[Loan Void] ${session.displayName} (${session.username}) -> CANCELLED - ${reason}`
    const mergedDescription = [loan.description?.trim(), appendedNote].filter(Boolean).join('\n')

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_loans
        SET
          status = 'CANCELLED',
          description = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [mergedDescription || null, loan.id],
    )

    await recordHrAudit({
      actionType: 'LOAN_VOID',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `LOAN-${loan.id}`,
      detail: `Loan ${loan.loanType} untuk ${loan.employeeCode} - ${loan.fullName} dibatalkan secara non-destruktif dari status ${currentStatus} dengan alasan: ${reason}.`,
    })

    return Response.json({
      message: `Loan ${loan.loanType} untuk ${loan.employeeCode} - ${loan.fullName} berhasil dibatalkan tanpa menghapus histori.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
