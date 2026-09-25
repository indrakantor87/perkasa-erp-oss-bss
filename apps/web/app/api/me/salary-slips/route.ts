import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type SelfSlipRow = {
  id: number
  employee_id: number
  payroll_month: number
  payroll_year: number
  released_at: string | null
  status: string
  gross_total: number | null
  net_total: number | null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'KARYAWAN' && session.role !== 'HR' && session.role !== 'SUPER_ADMIN' && session.role !== 'OWNER' && session.role !== 'ADMIN') {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const url = new URL(request.url)
    const yearRaw = url.searchParams.get('year')
    const clauses: string[] = ['hss.employee_id = ?', '(hsv.salary_slip_id IS NULL AND hss.released_at IS NOT NULL)']
    const params: unknown[] = [me.id]
    if (yearRaw && /^\d{4}$/.test(yearRaw.trim())) {
      clauses.push('hss.payroll_year = ?')
      params.push(Number(yearRaw.trim()))
    }
    const rows = await runReviewDbQuery<SelfSlipRow>(
      `
        SELECT hss.id,
               hss.employee_id,
               hss.payroll_month,
               hss.payroll_year,
               CAST(hss.released_at AS CHAR) AS released_at,
               CASE
                 WHEN hsv.salary_slip_id IS NOT NULL THEN 'VOID'
                 WHEN hss.released_at IS NOT NULL THEN 'RELEASED'
                 ELSE 'DRAFT' END AS status,
               hss.gross_total,
               hss.net_total
        FROM hr_salary_slips hss
        LEFT JOIN hr_salary_slip_voids hsv ON hsv.salary_slip_id = hss.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY hss.payroll_year DESC, hss.payroll_month DESC
        LIMIT 100
      `,
      params,
    )
    return Response.json({ data: rows, total: rows.length, self: true, identity: { id: me.id } })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : 'Gagal memuat salary slips.'
    return Response.json({ message }, { status })
  }
}
