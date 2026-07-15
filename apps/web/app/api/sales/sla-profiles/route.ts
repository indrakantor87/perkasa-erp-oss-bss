import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type SlaProfileRow = {
  id: number
  code: string
  name: string
  responseHours: number | null
  restoreHours: number | null
  availabilityPercent: number | null
  notes: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ profiles: [] })
  }

  const [hasId, hasCode, hasName] = await Promise.all([
    hasReviewDbColumn('sales_sla_profiles', 'id'),
    hasReviewDbColumn('sales_sla_profiles', 'code'),
    hasReviewDbColumn('sales_sla_profiles', 'name'),
  ])
  if (!hasId || !hasCode || !hasName) {
    return Response.json({ profiles: [] })
  }

  const profiles = await runReviewDbQuery<SlaProfileRow>(`
    SELECT
      id,
      code,
      name,
      ${await hasReviewDbColumn('sales_sla_profiles', 'response_hours') ? 'response_hours' : 'NULL'} AS responseHours,
      ${await hasReviewDbColumn('sales_sla_profiles', 'restore_hours') ? 'restore_hours' : 'NULL'} AS restoreHours,
      ${await hasReviewDbColumn('sales_sla_profiles', 'availability_percent') ? 'availability_percent' : 'NULL'} AS availabilityPercent,
      ${await hasReviewDbColumn('sales_sla_profiles', 'notes') ? 'notes' : 'NULL'} AS notes
    FROM sales_sla_profiles
    ORDER BY id DESC
    LIMIT 50
  `)

  return Response.json({ profiles })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action SLA profile hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      code?: unknown
      name?: unknown
      responseHours?: unknown
      restoreHours?: unknown
      availabilityPercent?: unknown
      notes?: unknown
    }

    const code = String(payload.code ?? '').trim().toUpperCase()
    const name = String(payload.name ?? '').trim()
    const responseHours = Number(payload.responseHours ?? 0)
    const restoreHours = Number(payload.restoreHours ?? 0)
    const availabilityPercent = Number(payload.availabilityPercent ?? 0)
    const notesRaw = String(payload.notes ?? '').trim()

    if (!code) {
      return Response.json({ message: 'Kode SLA wajib diisi.' }, { status: 400 })
    }
    if (!name) {
      return Response.json({ message: 'Nama SLA wajib diisi.' }, { status: 400 })
    }

    const [hasId, hasCode, hasName] = await Promise.all([
      hasReviewDbColumn('sales_sla_profiles', 'id'),
      hasReviewDbColumn('sales_sla_profiles', 'code'),
      hasReviewDbColumn('sales_sla_profiles', 'name'),
    ])
    if (!hasId || !hasCode || !hasName) {
      return Response.json(
        { message: 'Schema sales_sla_profiles belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_sla_profiles (
          code,
          name,
          response_hours,
          restore_hours,
          availability_percent,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        code,
        name,
        Number.isFinite(responseHours) ? Math.max(0, Math.round(responseHours)) : 0,
        Number.isFinite(restoreHours) ? Math.max(0, Math.round(restoreHours)) : 0,
        Number.isFinite(availabilityPercent) ? Math.max(0, availabilityPercent) : 0,
        notesRaw || null,
      ],
    )

    return Response.json({ message: `SLA profile ${code} berhasil dibuat.` })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

