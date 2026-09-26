import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'

type LeaveTypeRow = {
  id: number
  code: string
  name: string
  description: string | null
  needs_docs: number
  deduct_balance: number
  is_active: number
}

type InsertResult = { insertId?: number; affectedRows?: number; changedRows?: number }
type CountRow = { n: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseTinyInt(value: unknown): number {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1
  return 0
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view') && !canPerformAction(session.role, 'leave_requests', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  await ensureHrBatch02b()
  const url = new URL(request.url)
  const keyword = String(url.searchParams.get('keyword') ?? '').trim()
  const isActiveRaw = url.searchParams.get('is_active')

  const clauses: string[] = []
  const params: unknown[] = []

  if (isActiveRaw !== null && isActiveRaw !== '') {
    clauses.push('is_active = ?')
    params.push(parseTinyInt(isActiveRaw))
  } else {
    clauses.push('is_active = 1')
  }

  if (keyword) {
    clauses.push('(UPPER(name) LIKE ? OR UPPER(code) LIKE ?)')
    const like = `%${keyword.toUpperCase()}%`
    params.push(like, like)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<LeaveTypeRow>(
    `SELECT id, code, name, description, needs_docs, deduct_balance, is_active FROM hr_leave_types ${where} ORDER BY name ASC LIMIT 500`,
    params,
  )
  return Response.json({ data: rows, total: rows.length })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'create') && !canPerformAction(session.role, 'leave_requests', 'approve')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch02b()
  try {
    const payload = (await request.json()) as {
      code?: unknown
      name?: unknown
      description?: unknown
      needs_docs?: unknown
      deduct_balance?: unknown
      is_active?: unknown
    }
    const code = String(payload.code ?? '').trim()
    const name = String(payload.name ?? '').trim()
    const description = payload.description === undefined || payload.description === null ? null : String(payload.description).trim()
    const needsDocs = payload.needs_docs === undefined ? 0 : parseTinyInt(payload.needs_docs)
    const deductBalance = payload.deduct_balance === undefined ? 1 : parseTinyInt(payload.deduct_balance)
    const isActive = payload.is_active === undefined ? 1 : parseTinyInt(payload.is_active)

    if (!code) return Response.json({ message: 'code wajib diisi.' }, { status: 400 })
    if (!name) return Response.json({ message: 'name wajib diisi.' }, { status: 400 })

    const dup = await runReviewDbQuery<{ id: number }>(
      `SELECT id FROM hr_leave_types WHERE UPPER(code) = UPPER(?) LIMIT 1`,
      [code],
    )
    if (dup.length > 0) {
      return Response.json({ message: `Leave type code ${code} sudah terdaftar.` }, { status: 400 })
    }

    const res = await runReviewDbExecute<InsertResult>(
      `INSERT INTO hr_leave_types (code, name, description, needs_docs, deduct_balance, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      [code, name, description, needsDocs, deductBalance, isActive],
    )
    const id = Number(res.insertId ?? 0)
    await recordHrAudit({
      actionType: 'LEAVE_TYPE_CREATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_TYPE-${id}`,
      detail: `Create leave type id=${id} code=${code} name=${name} needs_docs=${needsDocs} deduct_balance=${deductBalance}`,
    })
    return Response.json(
      { id, code, name, description, needs_docs: needsDocs, deduct_balance: deductBalance, is_active: isActive },
      { status: 201 },
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal create leave type: ${detail}` }, { status: 500 })
  }
}
