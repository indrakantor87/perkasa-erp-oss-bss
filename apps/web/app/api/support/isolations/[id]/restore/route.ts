import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ReviewIsolationRow = {
  id: number
  customerName: string
  status: string
  restorationDate: string | Date | null
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getIsolationById(id: number) {
  const [row] = await runReviewDbQuery<ReviewIsolationRow>(
    `
      SELECT
        id,
        customer_name AS customerName,
        status,
        restoration_date AS restorationDate
      FROM support_isolations
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'support', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Restorasi isolir hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const resolvedParams = await params
    const isolationId = Number(resolvedParams.id)
    if (!Number.isInteger(isolationId) || isolationId <= 0) {
      return Response.json({ message: 'ID isolir tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as { closeNote?: unknown }
    const closeNote = normalizeRequiredText(payload.closeNote)
    if (!closeNote) {
      return Response.json({ message: 'Catatan restorasi wajib diisi.' }, { status: 400 })
    }

    const isolation = await getIsolationById(isolationId)
    if (!isolation) {
      return Response.json({ message: 'Data isolir tidak ditemukan.' }, { status: 404 })
    }
    if (isolation.restorationDate || isolation.status.trim().toUpperCase() === 'CLOSED') {
      return Response.json({ message: `Isolir ${isolation.id} sudah ditutup sebelumnya.` }, { status: 409 })
    }

    const normalizedCloseNote = `[Restored via web] ${session.displayName} (${session.username}) - ${closeNote}`

    await runReviewDbExecute(
      `
        UPDATE support_isolations
        SET
          status = 'CLOSED',
          restoration_date = CURRENT_TIMESTAMP,
          close_note = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [normalizedCloseNote, isolationId]
    )

    return Response.json({
      message: `Isolir aktif ${isolation.id} untuk ${isolation.customerName} berhasil direstorasi.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
