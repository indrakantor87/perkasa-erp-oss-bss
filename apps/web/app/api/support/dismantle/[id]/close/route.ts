import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
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

type ReviewIsolationCloseStateRow = {
  id: number
  status: string
  archivedAt: string | Date | null
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getDismantleQueueById(id: string) {
  const [
    hasIsolationId,
    hasTransferNote,
    hasCustomerName,
    hasCustomerAddress,
    hasCustomerPhone,
    hasMarketingName,
    hasRadboxName,
  ] = await Promise.all([
    hasReviewDbColumn('support_dismantle_queue', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
    hasReviewDbColumn('support_isolations', 'customer_name'),
    hasReviewDbColumn('support_isolations', 'customer_address'),
    hasReviewDbColumn('support_isolations', 'customer_phone'),
    hasReviewDbColumn('support_isolations', 'marketing_name'),
    hasReviewDbColumn('support_isolations', 'radbox_name'),
  ])

  if (!hasIsolationId || !hasCustomerName) {
    throw new Error('Schema inti support_dismantle_queue/support_isolations belum siap. Kolom isolation_id dan customer_name wajib tersedia.')
  }

  const [row] = await runReviewDbQuery<ReviewDismantleQueueRow>(
    `
      SELECT
        dq.id AS queueId,
        dq.isolation_id AS isolationId,
        ${hasTransferNote ? 'dq.transfer_note' : 'NULL'} AS transferNote,
        si.customer_name AS customerName,
        ${hasCustomerAddress ? 'si.customer_address' : 'NULL'} AS customerAddress,
        ${hasCustomerPhone ? 'si.customer_phone' : 'NULL'} AS customerPhone,
        ${hasMarketingName ? 'si.marketing_name' : 'NULL'} AS marketingName,
        ${hasRadboxName ? 'si.radbox_name' : 'NULL'} AS radboxName
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

async function getIsolationCloseState(id: number) {
  const [hasStatus, hasArchivedAt] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'archived_at'),
  ])

  if (!hasStatus) {
    throw new Error('Schema inti support_isolations belum siap. Kolom status wajib tersedia.')
  }

  const [row] = await runReviewDbQuery<ReviewIsolationCloseStateRow>(
    `
      SELECT
        id,
        status,
        ${hasArchivedAt ? 'archived_at' : 'NULL'} AS archivedAt
      FROM support_isolations
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  return row ?? null
}

async function buildDismantleHistoryInsertPayload(params: {
  isolationId: number
  customerName: string
  customerAddress: string | null
  customerPhone: string | null
  marketingName: string | null
  radboxName: string | null
  historyCloseNote: string
}) {
  const [
    hasIsolationId,
    hasCustomerName,
    hasCustomerAddress,
    hasCustomerPhone,
    hasMarketingName,
    hasRadboxName,
    hasClosedAt,
    hasCloseNote,
  ] = await Promise.all([
    hasReviewDbColumn('support_dismantle_history', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_history', 'customer_name'),
    hasReviewDbColumn('support_dismantle_history', 'customer_address'),
    hasReviewDbColumn('support_dismantle_history', 'customer_phone'),
    hasReviewDbColumn('support_dismantle_history', 'marketing_name'),
    hasReviewDbColumn('support_dismantle_history', 'radbox_name'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
    hasReviewDbColumn('support_dismantle_history', 'close_note'),
  ])

  const columns: string[] = []
  const values: unknown[] = []

  if (hasIsolationId) {
    columns.push('isolation_id')
    values.push(params.isolationId)
  }
  if (hasCustomerName) {
    columns.push('customer_name')
    values.push(params.customerName)
  }
  if (hasCustomerAddress) {
    columns.push('customer_address')
    values.push(params.customerAddress)
  }
  if (hasCustomerPhone) {
    columns.push('customer_phone')
    values.push(params.customerPhone)
  }
  if (hasMarketingName) {
    columns.push('marketing_name')
    values.push(params.marketingName)
  }
  if (hasRadboxName) {
    columns.push('radbox_name')
    values.push(params.radboxName)
  }
  if (hasClosedAt) {
    columns.push('closed_at')
  }
  if (hasCloseNote) {
    columns.push('close_note')
    values.push(params.historyCloseNote)
  }

  if (!columns.length) {
    throw new Error('Schema support_dismantle_history belum siap untuk menerima data penutupan.')
  }

  const placeholders = columns.map((column) => (column === 'closed_at' ? 'CURRENT_TIMESTAMP' : '?'))

  return {
    columns,
    placeholders,
    values,
  }
}

async function buildIsolationCloseAssignments(normalizedCloseNote: string) {
  const [hasStatus, hasCloseNote, hasIsArchived, hasArchivedAt, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'close_note'),
    hasReviewDbColumn('support_isolations', 'is_archived'),
    hasReviewDbColumn('support_isolations', 'archived_at'),
    hasReviewDbColumn('support_isolations', 'updated_at'),
  ])

  if (!hasStatus) {
    throw new Error('Schema inti support_isolations belum siap. Kolom status wajib tersedia.')
  }

  const assignments = [`status = 'CLOSED'`]
  const values: unknown[] = []

  if (hasCloseNote) {
    assignments.push('close_note = ?')
    values.push(normalizedCloseNote)
  }
  if (hasIsArchived) {
    assignments.push('is_archived = 1')
  }
  if (hasArchivedAt) {
    assignments.push('archived_at = CURRENT_TIMESTAMP')
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
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

    const isolationState = await getIsolationCloseState(queue.isolationId)
    if (!isolationState) {
      return Response.json({ message: 'Data isolir asal queue dismantle tidak ditemukan.' }, { status: 404 })
    }
    const normalizedIsolationStatus = normalizeRequiredText(isolationState.status).toUpperCase()
    if (normalizedIsolationStatus === 'CLOSED' && isolationState.archivedAt) {
      return Response.json(
        { message: `Isolir ${queue.isolationId} sudah berada di histori dismantle.` },
        { status: 409 },
      )
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
    const historyInsertPayload = await buildDismantleHistoryInsertPayload({
      isolationId: queue.isolationId,
      customerName: queue.customerName,
      customerAddress: queue.customerAddress,
      customerPhone: queue.customerPhone,
      marketingName: queue.marketingName,
      radboxName: queue.radboxName,
      historyCloseNote,
    })
    const isolationClosePayload = await buildIsolationCloseAssignments(normalizedCloseNote)

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          INSERT INTO support_dismantle_history (
            ${historyInsertPayload.columns.join(',\n            ')}
          )
          VALUES (${historyInsertPayload.placeholders.join(', ')})
        `,
        historyInsertPayload.values,
      )

      await connection.query(
        `
          UPDATE support_isolations
          SET
            ${isolationClosePayload.assignments.join(',\n            ')}
          WHERE id = ?
        `,
        [...isolationClosePayload.values, queue.isolationId],
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
