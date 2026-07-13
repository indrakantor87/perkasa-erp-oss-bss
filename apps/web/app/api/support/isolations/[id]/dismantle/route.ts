import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
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
  const [
    hasCustomerName,
    hasStatus,
    hasCustomerAddress,
    hasCustomerPhone,
    hasMarketingName,
    hasRadboxName,
    hasCloseNote,
    hasArchivedAt,
  ] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'customer_name'),
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'customer_address'),
    hasReviewDbColumn('support_isolations', 'customer_phone'),
    hasReviewDbColumn('support_isolations', 'marketing_name'),
    hasReviewDbColumn('support_isolations', 'radbox_name'),
    hasReviewDbColumn('support_isolations', 'close_note'),
    hasReviewDbColumn('support_isolations', 'archived_at'),
  ])

  if (!hasCustomerName || !hasStatus) {
    throw new Error('Schema inti support_isolations belum siap. Kolom customer_name dan status wajib tersedia.')
  }

  const [row] = await runReviewDbQuery<ReviewIsolationRow>(
    `
      SELECT
        id,
        customer_name AS customerName,
        ${hasCustomerAddress ? 'customer_address' : 'NULL'} AS customerAddress,
        ${hasCustomerPhone ? 'customer_phone' : 'NULL'} AS customerPhone,
        ${hasMarketingName ? 'marketing_name' : 'NULL'} AS marketingName,
        ${hasRadboxName ? 'radbox_name' : 'NULL'} AS radboxName,
        status,
        ${hasCloseNote ? 'close_note' : 'NULL'} AS closeNote,
        ${hasArchivedAt ? 'archived_at' : 'NULL'} AS archivedAt
      FROM support_isolations
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row ?? null
}

async function buildDismantleQueueInsertPayload(params: {
  isolationId: string
  transferNote: string
  username: string
}) {
  const [hasIsolationId, hasTransferNote, hasTransferredByUsername] = await Promise.all([
    hasReviewDbColumn('support_dismantle_queue', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
    hasReviewDbColumn('support_dismantle_queue', 'transferred_by_username'),
  ])

  if (!hasIsolationId) {
    throw new Error('Schema inti support_dismantle_queue belum siap. Kolom isolation_id wajib tersedia.')
  }

  const columns = ['isolation_id']
  const values: unknown[] = [params.isolationId]

  if (hasTransferNote) {
    columns.push('transfer_note')
    values.push(params.transferNote)
  }
  if (hasTransferredByUsername) {
    columns.push('transferred_by_username')
    values.push(params.username)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
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
    if (isolation.status.trim().toUpperCase() === 'CLOSED') {
      return Response.json({ message: `Isolir ${isolation.id} sudah closed dan tidak bisa dipindah ke dismantle.` }, { status: 409 })
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
    const queueInsertPayload = await buildDismantleQueueInsertPayload({
      isolationId: isolation.id,
      transferNote: normalizedTransferNote,
      username: session.username,
    })

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          INSERT INTO support_dismantle_queue (
            ${queueInsertPayload.columns.join(',\n            ')}
          )
          VALUES (${queueInsertPayload.placeholders.join(', ')})
        `,
        queueInsertPayload.values,
      )
    })

    return Response.json({
      message: `Isolir ${isolation.id} untuk ${isolation.customerName} berhasil dipindahkan ke queue dismantle.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
