import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'

type PositionRow = { id: number; position_code: string; name: string; is_active: number }
type CountRow = { n: number }
type InsertResult = { insertId?: number; affectedRows?: number; changedRows?: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
function parseIsActive(value: unknown): number {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1
  return 0
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  await ensureHrBatch01Schema()
  const url = new URL(request.url)
  const keyword = String(url.searchParams.get('keyword') ?? '').trim()
  const isActiveRaw = url.searchParams.get('is_active')

  const clauses: string[] = []
  const params: unknown[] = []
  if (isActiveRaw !== null && isActiveRaw !== '') {
    clauses.push('is_active = ?')
    params.push(parseIsActive(isActiveRaw))
  }
  if (keyword) {
    clauses.push('(UPPER(name) LIKE ? OR UPPER(position_code) LIKE ?)')
    const like = `%${keyword.toUpperCase()}%`
    params.push(like, like)
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<PositionRow>(
    `SELECT id, position_code, name, is_active FROM org_positions ${where} ORDER BY name ASC LIMIT 500`,
    params,
  )
  return Response.json({ data: rows, total: rows.length })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'create')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch01Schema()
  try {
    const payload = (await request.json()) as { position_code?: unknown; name?: unknown; is_active?: unknown }
    const positionCode = String(payload.position_code ?? '').trim()
    const name = String(payload.name ?? '').trim()
    const isActive = payload.is_active === undefined ? 1 : parseIsActive(payload.is_active)
    if (!positionCode) return Response.json({ message: 'position_code wajib diisi.' }, { status: 400 })
    if (!name) return Response.json({ message: 'name position wajib diisi.' }, { status: 400 })

    const dup = await runReviewDbQuery<{ id: number }>(
      `SELECT id FROM org_positions WHERE UPPER(position_code) = UPPER(?) LIMIT 1`,
      [positionCode],
    )
    if (dup.length > 0) return Response.json({ message: `position_code ${positionCode} sudah terdaftar.` }, { status: 400 })

    const res = await runReviewDbExecute<InsertResult>(
      `INSERT INTO org_positions (position_code, name, is_active) VALUES (?, ?, ?)`,
      [positionCode, name, isActive],
    )
    const id = Number(res.insertId ?? 0)
    await recordHrAudit({
      actionType: 'ORG_POSITION_CREATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `POSITION-${id}`,
      detail: `Create position id=${id} code=${positionCode} name=${name} active=${isActive}`,
    })
    return Response.json({ id, position_code: positionCode, name, is_active: isActive }, { status: 201 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal create position: ${detail}` }, { status: 500 })
  }
}
