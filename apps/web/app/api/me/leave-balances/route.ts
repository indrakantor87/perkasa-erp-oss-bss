import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type LeaveBalanceJoinRow = {
  id: number
  employee_id: number
  leave_type_id: number
  leave_type_code: string | null
  leave_type_name: string | null
  fiscal_year: number
  balance_initial: number
  balance_used: number
  balance_remaining: number
  needs_docs: number
  deduct_balance: number
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  await ensureHrBatch02b()

  const me = await requireEmployeeByAuthUserId(session.userId)
  const canonicalTrustedEmpId = me.id

  const url = new URL(request.url)
  const _empIdParam = url.searchParams.get('employee_id')

  const currentYear = new Date().getFullYear()
  const fiscalYearRaw = url.searchParams.get('fiscal_year')
  const fiscalYear = fiscalYearRaw ? Number.parseInt(fiscalYearRaw, 10) || currentYear : currentYear

  const rows = await runReviewDbQuery<LeaveBalanceJoinRow>(
    `
      SELECT
        lb.id,
        lb.employee_id,
        lb.leave_type_id,
        lt.code AS leave_type_code,
        lt.name AS leave_type_name,
        lb.fiscal_year,
        lb.balance_initial,
        lb.balance_used,
        lb.balance_remaining,
        lt.needs_docs,
        lt.deduct_balance
      FROM hr_leave_balances lb
      LEFT JOIN hr_leave_types lt ON lt.id = lb.leave_type_id
      WHERE lb.employee_id = ?
        AND lb.fiscal_year = ?
        AND lt.is_active = 1
      ORDER BY lt.name ASC
    `,
    [canonicalTrustedEmpId, fiscalYear],
  )

  return Response.json({
    self: true,
    employee_id: canonicalTrustedEmpId,
    fiscal_year: fiscalYear,
    data: rows.map((row) => ({
      ...row,
      leave_type: {
        id: row.leave_type_id,
        code: row.leave_type_code,
        name: row.leave_type_name,
        needs_docs: row.needs_docs === 1,
        deduct_balance: row.deduct_balance === 1,
      },
    })),
    total: rows.length,
  })
}
