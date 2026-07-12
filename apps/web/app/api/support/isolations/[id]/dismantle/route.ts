import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import {
  buildSupportDismantleTransferNote,
  ensureSupportDismantleQueueTable,
} from '@/lib/services/support-dismantle-service'
import { canProcessSupportDismantle } from '@/lib/support-lanes'

type ReviewIsolationRow = {
  id: string
  customerName: string
  customerAddress: string | null
  customerPhone: string | null
  marketingName: string | null
  radboxName: string | null
  status: string
  closeNote: string | null
  archivedAt: string | Date | null
}

type ReviewDismantleQueueRow = {
  id: number
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getIsolationById(id: string) {
  const [row] = await runReviewDbQuery<ReviewIsolationRow>(
    `
      SELECT
        id,
        customer_name AS customerName,
        customer_address AS customerAddress,
        customer_phone AS customerPhone,
        marketing_name AS marketingName,
        radbox_name AS radboxName,
        status,
        close_note AS closeNote,
        archived_at AS archivedAt
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
  if (!canProcessSupportDismantle(session.role, canPerformAction(session.role, 'support', 'approve'))) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Flow transfer dismantle hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    await ensureSupportDismantleQueueTable()

    const resolvedParams = await params
    const isolationId = String(resolvedParams.id ?? '').trim()
    if (!isolationId) {
      return Response.json({ message: 'ID isolir tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as { transferNote?: unknown; closeNote?: unknown }
    const transferNote = normalizeRequiredText(payload.transferNote ?? payload.closeNote)
    if (!transferNote) {
      return Response.json({ message: 'Catatan transfer dismantle wajib diisi.' }, { status: 400 })
    }

    const isolation = await getIsolationById(isolationId)
    if (!isolation) {
      return Response.json({ message: 'Data isolir tidak ditemukan.' }, { status: 404 })
    }
    if (isolation.archivedAt) {
      return Response.json({ message: `Isolir ${isolation.id} sudah masuk histori dismantle.` }, { status: 409 })
    }

    const existingQueue = await runReviewDbQuery<ReviewDismantleQueueRow>(
      `
        SELECT id
        FROM support_dismantle_queue
        WHERE isolation_id = ?
        LIMIT 1
      `,
      [isolation.id]
    )
    if (existingQueue[0]) {
      return Response.json({ message: `Isolir ${isolation.id} sudah ada di queue dismantle.` }, { status: 409 })
    }

    const normalizedTransferNote = buildSupportDismantleTransferNote(session, transferNote)

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          INSERT INTO support_dismantle_queue (
            isolation_id,
            transfer_note,
            transferred_by_username
          )
          VALUES (?, ?, ?)
        `,
        [
          isolation.id,
          normalizedTransferNote,
          session.username,
        ],
      )
    })

    return Response.json({
      message: `Isolir ${isolation.id} untuk ${isolation.customerName} berhasil dipindahkan ke queue dismantle.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
