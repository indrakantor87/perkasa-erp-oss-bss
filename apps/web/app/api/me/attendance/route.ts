import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type AttendanceRow = {
  id: number
  employee_id: number
  attendance_date: string
  clock_in: string | null
  clock_out: string | null
  status: string | null
  source_type: string | null
  ot_minutes: number
  locked: number
}

function parseDate(value: unknown): string | null {
  if (!value) return null
  const raw = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  return raw
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
    const from = parseDate(url.searchParams.get('from_date'))
    const to = parseDate(url.searchParams.get('to_date'))
    const clauses: string[] = ['employee_id = ?']
    const params: unknown[] = [me.id]
    if (from) { clauses.push('attendance_date >= ?'); params.push(from) }
    if (to) { clauses.push('attendance_date <= ?'); params.push(to) }
    const rows = await runReviewDbQuery<AttendanceRow>(
      `SELECT id, employee_id, attendance_date, clock_in, clock_out, status, source_type, ot_minutes, locked FROM hr_attendance WHERE ${clauses.join(' AND ')} ORDER BY attendance_date DESC LIMIT 500`,
      params,
    )
    return Response.json({ data: rows, total: rows.length, identity: { id: me.id, employee_code: me.employee_code }, self: true })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : 'Gagal memuat attendance.'
    return Response.json({ message }, { status })
  }
}
