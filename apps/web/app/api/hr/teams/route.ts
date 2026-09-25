import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'

type TeamRow = {
  id: number
  division_id: number | null
  team_code: string
  name: string
  is_active: number
  created_at?: string
  updated_at?: string
}

type DivisionRow = { id: number }
type EmployeeRefCountRow = { n: number }
type InsertResult = { insertId?: number; affectedRows?: number; changedRows?: number }

function parseNullableInt(value: unknown): number | null {
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
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  await ensureHrBatch01Schema()
  const url = new URL(request.url)
  const divisionId = parseNullableInt(url.searchParams.get('division_id'))
  const isActiveRaw = url.searchParams.get('is_active')
  const keyword = String(url.searchParams.get('keyword') ?? '').trim()

  const clauses: string[] = []
  const params: unknown[] = []
  if (divisionId !== null) {
    clauses.push('t.division_id = ?')
    params.push(divisionId)
  }
  if (isActiveRaw !== null && isActiveRaw !== '') {
    clauses.push('t.is_active = ?')
    params.push(parseIsActive(isActiveRaw))
  }
  if (keyword) {
    clauses.push('(UPPER(t.name) LIKE ? OR UPPER(t.team_code) LIKE ?)')
    const like = `%${keyword.toUpperCase()}%`
    params.push(like, like)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<TeamRow & { division_name: string | null }>(
    `
      SELECT t.id, t.division_id, t.team_code, t.name, t.is_active, d.name AS division_name
      FROM org_teams t
      LEFT JOIN org_divisions d ON d.id = t.division_id
      ${where}
      ORDER BY t.name ASC
      LIMIT 500
    `,
    params,
  )

  return Response.json({ data: rows, total: rows.length })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch01Schema()
  try {
    const payload = (await request.json()) as {
      division_id?: unknown
      team_code?: unknown
      name?: unknown
      is_active?: unknown
    }
    const divisionId = parseNullableInt(payload.division_id)
    const teamCode = String(payload.team_code ?? '').trim()
    const name = String(payload.name ?? '').trim()
    const isActive = payload.is_active === undefined ? 1 : parseIsActive(payload.is_active)

    if (!teamCode) return Response.json({ message: 'team_code wajib diisi.' }, { status: 400 })
    if (!name) return Response.json({ message: 'name team wajib diisi.' }, { status: 400 })

    if (divisionId !== null) {
      const divs = await runReviewDbQuery<DivisionRow>(`SELECT id FROM org_divisions WHERE id = ? LIMIT 1`, [divisionId])
      if (divs.length === 0) return Response.json({ message: 'division_id tidak ditemukan di org_divisions.' }, { status: 400 })
    }

    const uniqueCheck = await runReviewDbQuery<{ id: number }>(
      `SELECT id FROM org_teams WHERE division_id <=> ? AND UPPER(team_code) = UPPER(?) LIMIT 1`,
      [divisionId, teamCode],
    )
    if (uniqueCheck.length > 0) {
      return Response.json(
        { message: `team_code ${teamCode} sudah ada di divisi yang sama.` },
        { status: 400 },
      )
    }

    const result = await runReviewDbExecute<InsertResult>(
      `INSERT INTO org_teams (division_id, team_code, name, is_active) VALUES (?, ?, ?, ?)`,
      [divisionId, teamCode, name, isActive],
    )

    const id = Number(result.insertId ?? 0)
    await recordHrAudit({
      actionType: 'ORG_TEAM_CREATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `TEAM-${id}`,
      detail: `Create team id=${id} code=${teamCode} name=${name} div=${divisionId} active=${isActive}`,
    })
    return Response.json({ id, team_code: teamCode, name, division_id: divisionId, is_active: isActive }, { status: 201 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal create team: ${detail}` }, { status: 500 })
  }
}
