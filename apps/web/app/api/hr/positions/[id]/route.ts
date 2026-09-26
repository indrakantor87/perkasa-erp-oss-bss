import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'

type PositionRow = { id: number; position_code: string; name: string; is_active: number }
type CountRow = { n: number }
type ExecuteResult = { affectedRows?: number; changedRows?: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
function parseIsActive(value: unknown): number {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1
  return 0
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  await ensureHrBatch01Schema()
  const id = parsePositiveInt(idLocal)
  if (!id) return Response.json({ message: 'id position tidak valid.' }, { status: 400 })
  const rows = await runReviewDbQuery<PositionRow>(
    `SELECT id, position_code, name, is_active FROM org_positions WHERE id = ? LIMIT 1`,
    [id],
  )
  if (rows.length === 0) return Response.json({ message: 'Position tidak ditemukan.' }, { status: 404 })
  return Response.json({ data: rows[0] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch01Schema()
  const id = parsePositiveInt(idLocal)
  if (!id) return Response.json({ message: 'id position tidak valid.' }, { status: 400 })
  try {
    const payload = (await request.json()) as { position_code?: unknown; name?: unknown; is_active?: unknown }
    const [existing] = await runReviewDbQuery<PositionRow>(
      `SELECT id, position_code, name, is_active FROM org_positions WHERE id = ? LIMIT 1`,
      [id],
    )
    if (!existing) return Response.json({ message: 'Position tidak ditemukan.' }, { status: 404 })
    const nextCode = payload.position_code === undefined ? existing.position_code : String(payload.position_code).trim()
    const nextName = payload.name === undefined ? existing.name : String(payload.name).trim()
    const nextActive = payload.is_active === undefined ? existing.is_active : parseIsActive(payload.is_active)

    if (nextCode === '') return Response.json({ message: 'position_code tidak boleh kosong.' }, { status: 400 })
    if (nextName === '') return Response.json({ message: 'name tidak boleh kosong.' }, { status: 400 })

    if (nextCode.toUpperCase() !== existing.position_code.toUpperCase()) {
      const dup = await runReviewDbQuery<{ id: number }>(
        `SELECT id FROM org_positions WHERE UPPER(position_code) = UPPER(?) AND id <> ? LIMIT 1`,
        [nextCode, id],
      )
      if (dup.length > 0) return Response.json({ message: `position_code ${nextCode} sudah terpakai position lain.` }, { status: 400 })
    }
    const res = await runReviewDbExecute<ExecuteResult>(
      `UPDATE org_positions SET position_code = ?, name = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
      [nextCode, nextName, nextActive, id],
    )
    await recordHrAudit({
      actionType: 'ORG_POSITION_UPDATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `POSITION-${id}`,
      detail: `Update position id=${id} code=${nextCode} name=${nextName} active=${nextActive} changed=${res.changedRows ?? 0}`,
    })
    return Response.json({ id, position_code: nextCode, name: nextName, is_active: nextActive })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal update position: ${detail}` }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch01Schema()
  const id = parsePositiveInt(idLocal)
  if (!id) return Response.json({ message: 'id position tidak valid.' }, { status: 400 })
  const [exists] = await runReviewDbQuery<PositionRow>(`SELECT id, name FROM org_positions WHERE id = ? LIMIT 1`, [id])
  if (!exists) return Response.json({ message: 'Position tidak ditemukan.' }, { status: 404 })
  const [cnt] = await runReviewDbQuery<CountRow>(`SELECT COUNT(*) AS n FROM hr_employees WHERE position_id = ?`, [id])
  const references = Number(cnt?.n ?? 0)
  if (references > 0) {
    return Response.json(
      { message: `Cannot delete position: still referenced by employees (count=${references}). Gunakan PUT is_active=0 untuk non-aktifkan atau reassigned position employee terlebih dahulu.` },
      { status: 400 },
    )
  }
  try {
    await runReviewDbExecute<ExecuteResult>(`UPDATE org_positions SET is_active = 0, updated_at = NOW() WHERE id = ?`, [id])
    const deleted = await runReviewDbExecute<ExecuteResult>(`DELETE FROM org_positions WHERE id = ? AND is_active = 0`, [id])
    await recordHrAudit({
      actionType: 'ORG_POSITION_DELETE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `POSITION-${id}`,
      detail: `Delete position id=${id} name=${exists.name} deleted=${deleted.affectedRows ?? 0}`,
    })
    return Response.json({ id, deleted: true, references, affected: deleted.affectedRows ?? 0 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal delete position: ${detail}` }, { status: 500 })
  }
}
