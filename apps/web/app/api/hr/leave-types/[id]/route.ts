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

type ExecuteResult = { affectedRows?: number; changedRows?: number }
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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view') && !canPerformAction(session.role, 'leave_requests', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  await ensureHrBatch02b()
  const id = parsePositiveInt(params.id)
  if (!id) return Response.json({ message: 'id leave type tidak valid.' }, { status: 400 })
  const rows = await runReviewDbQuery<LeaveTypeRow>(
    `SELECT id, code, name, description, needs_docs, deduct_balance, is_active FROM hr_leave_types WHERE id = ? LIMIT 1`,
    [id],
  )
  if (rows.length === 0) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
  return Response.json({ data: rows[0] })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update') && !canPerformAction(session.role, 'leave_requests', 'approve')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch02b()
  const id = parsePositiveInt(params.id)
  if (!id) return Response.json({ message: 'id leave type tidak valid.' }, { status: 400 })
  try {
    const payload = (await request.json()) as {
      name?: unknown
      description?: unknown
      needs_docs?: unknown
      deduct_balance?: unknown
      is_active?: unknown
    }
    const [existing] = await runReviewDbQuery<LeaveTypeRow>(
      `SELECT id, code, name, description, needs_docs, deduct_balance, is_active FROM hr_leave_types WHERE id = ? LIMIT 1`,
      [id],
    )
    if (!existing) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

    const nextName = payload.name === undefined ? existing.name : String(payload.name).trim()
    const nextDescription = payload.description === undefined
      ? existing.description
      : payload.description === null
        ? null
        : String(payload.description).trim()
    const nextNeedsDocs = payload.needs_docs === undefined ? existing.needs_docs : parseTinyInt(payload.needs_docs)
    const nextDeductBalance = payload.deduct_balance === undefined ? existing.deduct_balance : parseTinyInt(payload.deduct_balance)
    const nextActive = payload.is_active === undefined ? existing.is_active : parseTinyInt(payload.is_active)

    if (nextName === '') return Response.json({ message: 'name tidak boleh kosong.' }, { status: 400 })

    const res = await runReviewDbExecute<ExecuteResult>(
      `UPDATE hr_leave_types SET name = ?, description = ?, needs_docs = ?, deduct_balance = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
      [nextName, nextDescription, nextNeedsDocs, nextDeductBalance, nextActive, id],
    )
    await recordHrAudit({
      actionType: 'LEAVE_TYPE_UPDATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_TYPE-${id}`,
      detail: `Update leave type id=${id} name=${nextName} needs_docs=${nextNeedsDocs} deduct_balance=${nextDeductBalance} is_active=${nextActive} changed=${res.changedRows ?? 0}`,
    })
    return Response.json({
      id,
      code: existing.code,
      name: nextName,
      description: nextDescription,
      needs_docs: nextNeedsDocs,
      deduct_balance: nextDeductBalance,
      is_active: nextActive,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal update leave type: ${detail}` }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update') && !canPerformAction(session.role, 'leave_requests', 'approve')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch02b()
  const id = parsePositiveInt(params.id)
  if (!id) return Response.json({ message: 'id leave type tidak valid.' }, { status: 400 })
  const [exists] = await runReviewDbQuery<LeaveTypeRow>(
    `SELECT id, code, name FROM hr_leave_types WHERE id = ? LIMIT 1`,
    [id],
  )
  if (!exists) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  const [cnt] = await runReviewDbQuery<CountRow>(
    `SELECT COUNT(*) AS n FROM hr_leave_requests WHERE leave_type_id = ?`,
    [id],
  )
  const references = Number(cnt?.n ?? 0)
  if (references > 0) {
    return Response.json(
      { message: 'Leave type digunakan di permohonan tidak dapat dihapus.' },
      { status: 400 },
    )
  }
  try {
    await runReviewDbExecute<ExecuteResult>(
      `UPDATE hr_leave_types SET is_active = 0, updated_at = NOW() WHERE id = ?`,
      [id],
    )
    await recordHrAudit({
      actionType: 'LEAVE_TYPE_DELETE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_TYPE-${id}`,
      detail: `Soft delete leave type id=${id} code=${exists.code} name=${exists.name}`,
    })
    return Response.json({ id, deleted: true, references })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal delete leave type: ${detail}` }, { status: 500 })
  }
}
