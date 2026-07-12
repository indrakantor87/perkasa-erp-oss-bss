import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import {
  buildSupportDismantleCloseNote,
  ensureSupportDismantleQueueTable,
} from '@/lib/services/support-dismantle-service'
import { canProcessSupportDismantle } from '@/lib/support-lanes'

type ReviewDismantleQueueRow = {
  queueId: number
  isolationId: number
  transferNote: string | null
  customerName: string
  customerAddress: string | null
  customerPhone: string | null
  marketingName: string | null
  radboxName: string | null
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getDismantleQueueById(id: string) {
  const [row] = await runReviewDbQuery<ReviewDismantleQueueRow>(
    `
      SELECT
        dq.id AS queueId,
        dq.isolation_id AS isolationId,
        dq.transfer_note AS transferNote,
        si.customer_name AS customerName,
        si.customer_address AS customerAddress,
        si.customer_phone AS customerPhone,
        si.marketing_name AS marketingName,
        si.radbox_name AS radboxName
      FROM support_dismantle_queue dq
      INNER JOIN support_isolations si
        ON si.id = dq.isolation_id
      WHERE dq.id = ?
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
      { message: 'Flow close dismantle hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    await ensureSupportDismantleQueueTable()

    const resolvedParams = await params
    const queueId = String(resolvedParams.id ?? '').trim()
    if (!queueId) {
      return Response.json({ message: 'ID queue dismantle tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      closeNote?: unknown
      fieldPic?: unknown
      deviceStatus?: unknown
      pickupStatus?: unknown
      closeOutcome?: unknown
      billingDisposition?: unknown
    }
    const closeNote = normalizeRequiredText(payload.closeNote)
    if (!closeNote) {
      return Response.json({ message: 'Catatan close dismantle wajib diisi.' }, { status: 400 })
    }
    const fieldPic = normalizeRequiredText(payload.fieldPic)
    const deviceStatus = normalizeRequiredText(payload.deviceStatus)
    const pickupStatus = normalizeRequiredText(payload.pickupStatus)
    const closeOutcome = normalizeRequiredText(payload.closeOutcome)
    const billingDisposition = normalizeRequiredText(payload.billingDisposition)
    if (!fieldPic || !deviceStatus || !pickupStatus || !closeOutcome || !billingDisposition) {
      return Response.json({ message: 'Metadata close dismantle wajib diisi lengkap.' }, { status: 400 })
    }

    const queue = await getDismantleQueueById(queueId)
    if (!queue) {
      return Response.json({ message: 'Queue dismantle tidak ditemukan.' }, { status: 404 })
    }

    const normalizedCloseNote = buildSupportDismantleCloseNote(session, {
      closeNote,
      fieldPic,
      deviceStatus,
      pickupStatus,
      closeOutcome,
      billingDisposition,
    })
    const historyCloseNote = queue.transferNote
      ? `${queue.transferNote}\n${normalizedCloseNote}`
      : normalizedCloseNote

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          INSERT INTO support_dismantle_history (
            isolation_id,
            customer_name,
            customer_address,
            customer_phone,
            marketing_name,
            radbox_name,
            closed_at,
            close_note
          )
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `,
        [
          queue.isolationId,
          queue.customerName,
          queue.customerAddress,
          queue.customerPhone,
          queue.marketingName,
          queue.radboxName,
          historyCloseNote,
        ],
      )

      await connection.query(
        `
          UPDATE support_isolations
          SET
            status = 'CLOSED',
            close_note = ?,
            is_archived = 1,
            archived_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [normalizedCloseNote, queue.isolationId],
      )

      await connection.query(
        `
          DELETE FROM support_dismantle_queue
          WHERE id = ?
        `,
        [queue.queueId],
      )
    })

    return Response.json({
      message: `Queue dismantle ${queue.queueId} untuk ${queue.customerName} berhasil ditutup ke histori.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
