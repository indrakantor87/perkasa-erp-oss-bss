import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type DocumentMeta = {
  id: number
  employee_id: number
  document_type: string | null
  file_name: string | null
  file_size_bytes: number | null
  mime_type: string | null
  uploaded_at: string | null
  is_active: number
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'KARYAWAN' && session.role !== 'HR' && session.role !== 'SUPER_ADMIN' && session.role !== 'OWNER' && session.role !== 'ADMIN') {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const rows = await runReviewDbQuery<DocumentMeta>(
      `
        SELECT id, employee_id, document_type, file_name, file_size_bytes, mime_type, uploaded_at, is_active
        FROM hr_documents
        WHERE employee_id = ?
          AND is_active = 1
        ORDER BY uploaded_at DESC
        LIMIT 500
      `,
      [me.id],
    )
    return Response.json({ data: rows, total: rows.length, self: true, identity: { id: me.id } })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : 'Gagal memuat documents.'
    return Response.json({ message }, { status })
  }
}
