import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'

type TeamRow = { id: number; division_id: number | null; team_code: string; name: string; is_active: number }
type DivisionRow = { id: number }
type CountRow = { n: number }
type ExecuteResult = { affectedRows?: number; changedRows?: number }

function parseNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
function parsePositiveInt(value: unknown): number | null {
  const n = parseNullableInt(value)
  return n
}
function parseIsActive(value: unknown): number {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1
  return 0
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  await ensureHrBatch01Schema()
  const id = parsePositiveInt(params.id)
  if (!id) return Response.json({ message: 'id team tidak valid.' }, { status: 400 })
  const rows = await runReviewDbQuery<TeamRow & { division_name: string | null }>(
    `SELECT t.id, t.division_id, t.team_code, t.name, t.is_active, d.name AS division_name FROM org_teams t LEFT JOIN org_divisions d ON d.id = t.division_id WHERE t.id = ? LIMIT 1`,
    [id],
  )
  if (rows.length === 0) return Response.json({ message: 'Team tidak ditemukan.' }, { status: 404 })
  return Response.json({ data: rows[0] })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch01Schema()
  const id = parsePositiveInt(params.id)
  if (!id) return Response.json({ message: 'id team tidak valid.' }, { status: 400 })
  try {
    const payload = (await request.json()) as {
      division_id?: unknown
      team_code?: unknown
      name?: unknown
      is_active?: unknown
    }
    const divisionId = payload.division_id === undefined ? undefined : parseNullableInt(payload.division_id)
    const teamCode = payload.team_code === undefined ? undefined : String(payload.team_code).trim()
    const name = payload.name === undefined ? undefined : String(payload.name).trim()
    const isActive = payload.is_active === undefined ? undefined : parseIsActive(payload.is_active)

    const [existing] = await runReviewDbQuery<TeamRow>(`SELECT id, division_id, team_code, name, is_active FROM org_teams WHERE id = ? LIMIT 1`, [id])
    if (!existing) return Response.json({ message: 'Team tidak ditemukan.' }, { status: 404 })

    const nextDiv = divisionId !== undefined ? divisionId : existing.division_id
    const nextCode = teamCode !== undefined ? teamCode : existing.team_code
    const nextName = name !== undefined ? name : existing.name
    const nextActive = isActive !== undefined ? isActive : existing.is_active

    if (nextCode === '') return Response.json({ message: 'team_code tidak boleh kosong.' }, { status: 400 })
    if (nextName === '') return Response.json({ message: 'name tidak boleh kosong.' }, { status: 400 })

    if (nextDiv !== null) {
      const divs = await runReviewDbQuery<DivisionRow>(`SELECT id FROM org_divisions WHERE id = ? LIMIT 1`, [nextDiv])
      if (divs.length === 0) return Response.json({ message: 'division_id tidak ditemukan di org_divisions.' }, { status: 400 })
    }

    if (nextDiv !== existing.division_id || nextCode !== existing.team_code) {
      const dup = await runReviewDbQuery<{ id: number }>(
        `SELECT id FROM org_teams WHERE division_id <=> ? AND UPPER(team_code) = UPPER(?) AND id <> ? LIMIT 1`,
        [nextDiv, nextCode, id],
      )
      if (dup.length > 0) return Response.json({ message: 'team_code sudah ada di divisi tersebut.' }, { status: 400 })
    }

    const res = await runReviewDbExecute<ExecuteResult>(
      `UPDATE org_teams SET division_id = ?, team_code = ?, name = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
      [nextDiv, nextCode, nextName, nextActive, id],
    )
    await recordHrAudit({
      actionType: 'ORG_TEAM_UPDATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `TEAM-${id}`,
      detail: `Update team id=${id} div=${nextDiv} code=${nextCode} name=${nextName} active=${nextActive} changed=${res.changedRows ?? 0}`,
    })
    return Response.json({ id, division_id: nextDiv, team_code: nextCode, name: nextName, is_active: nextActive })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal update team: ${detail}` }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch01Schema()
  const id = parsePositiveInt(params.id)
  if (!id) return Response.json({ message: 'id team tidak valid.' }, { status: 400 })
  const [exists] = await runReviewDbQuery<TeamRow>(`SELECT id, name, is_active FROM org_teams WHERE id = ? LIMIT 1`, [id])
  if (!exists) return Response.json({ message: 'Team tidak ditemukan.' }, { status: 404 })
  const [cnt] = await runReviewDbQuery<CountRow>(
    `SELECT COUNT(*) AS n FROM hr_employees WHERE team_id = ?`,
    [id],
  )
  const references = Number(cnt?.n ?? 0)
  if (references > 0) {
    return Response.json(
      { message: `Cannot delete team: still referenced by employees (count=${references}). Set inactive (is_active=0) via PUT atau pindahkan team employee terlebih dahulu.` },
      { status: 400 },
    )
  }
  try {
    const inactiveFirst = await runReviewDbExecute<ExecuteResult>(`UPDATE org_teams SET is_active = 0, updated_at = NOW() WHERE id = ?`, [id])
    const deleted = await runReviewDbExecute<ExecuteResult>(`DELETE FROM org_teams WHERE id = ? AND is_active = 0`, [id])
    await recordHrAudit({
      actionType: 'ORG_TEAM_DELETE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `TEAM-${id}`,
      detail: `Delete team id=${id} name=${exists.name} inactiveChg=${inactiveFirst.changedRows ?? 0} deleted=${deleted.affectedRows ?? 0}`,
    })
    return Response.json({ id, deleted: true, references, affected: deleted.affectedRows ?? 0 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal delete team: ${detail}` }, { status: 500 })
  }
}
