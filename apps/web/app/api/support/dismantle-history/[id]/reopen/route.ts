import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import {
  buildSupportDismantleReopenNote,
  ensureSupportDismantleQueueTable,
} from '@/lib/services/support-dismantle-service'
import { canProcessSupportDismantle } from '@/lib/support-lanes'

type ReviewDismantleHistoryRow = {
  historyId: number
  isolationId: number | null
  customerName: string
}

type ReviewDismantleQueueRow = {
  id: number
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getDismantleHistoryById(id: string) {
  const [row] = await runReviewDbQuery<ReviewDismantleHistoryRow>(
    `
      SELECT
        id AS historyId,
        isolation_id AS isolationId,
        customer_name AS customerName
      FROM support_dismantle_history
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
      { message: 'Flow reopen dismantle hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    await ensureSupportDismantleQueueTable()

    const resolvedParams = await params
    const historyId = String(resolvedParams.id ?? '').trim()
    if (!historyId) {
      return Response.json({ message: 'ID histori dismantle tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as { reopenNote?: unknown }
    const reopenNote = normalizeRequiredText(payload.reopenNote)
    if (!reopenNote) {
      return Response.json({ message: 'Catatan reopen dismantle wajib diisi.' }, { status: 400 })
    }

    const history = await getDismantleHistoryById(historyId)
    if (!history) {
      return Response.json({ message: 'Histori dismantle tidak ditemukan.' }, { status: 404 })
    }
    if (!history.isolationId) {
      return Response.json({ message: 'Histori dismantle ini tidak punya referensi isolir aktif.' }, { status: 409 })
    }

    const existingQueue = await runReviewDbQuery<ReviewDismantleQueueRow>(
      `
        SELECT id
        FROM support_dismantle_queue
        WHERE isolation_id = ?
        LIMIT 1
      `,
      [history.isolationId]
    )
    if (existingQueue[0]) {
      return Response.json({ message: `Isolir ${history.isolationId} sudah aktif kembali di queue dismantle.` }, { status: 409 })
    }

    const normalizedReopenNote = buildSupportDismantleReopenNote(session, reopenNote)

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          UPDATE support_isolations
          SET
            status = 'OPEN',
            restoration_date = NULL,
            close_note = ?,
            is_archived = 0,
            archived_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [normalizedReopenNote, history.isolationId],
      )

      await connection.query(
        `
          INSERT INTO support_dismantle_queue (
            isolation_id,
            transfer_note,
            transferred_by_username,
            reopened_note
          )
          VALUES (?, ?, ?, ?)
        `,
        [history.isolationId, normalizedReopenNote, session.username, normalizedReopenNote],
      )

      await connection.query(
        `
          DELETE FROM support_dismantle_history
          WHERE id = ?
        `,
        [history.historyId],
      )
    })

    return Response.json({
      message: `Histori dismantle ${history.historyId} untuk ${history.customerName} berhasil dibuka kembali ke queue aktif.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
