import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
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

type ReviewIsolationReopenStateRow = {
  id: number
  status: string
  archivedAt: string | Date | null
  restorationDate: string | Date | null
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getDismantleHistoryById(id: string) {
  const [hasIsolationId, hasCustomerName] = await Promise.all([
    hasReviewDbColumn('support_dismantle_history', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_history', 'customer_name'),
  ])

  if (!hasIsolationId) {
    throw new Error('Schema inti support_dismantle_history belum siap. Kolom isolation_id wajib tersedia.')
  }

  const [row] = await runReviewDbQuery<ReviewDismantleHistoryRow>(
    `
      SELECT
        id AS historyId,
        isolation_id AS isolationId,
        ${hasCustomerName ? 'customer_name' : "''"} AS customerName
      FROM support_dismantle_history
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row ?? null
}

async function getIsolationReopenState(id: number) {
  const [hasStatus, hasArchivedAt, hasRestorationDate] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'archived_at'),
    hasReviewDbColumn('support_isolations', 'restoration_date'),
  ])

  if (!hasStatus) {
    throw new Error('Schema inti support_isolations belum siap. Kolom status wajib tersedia.')
  }

  const [row] = await runReviewDbQuery<ReviewIsolationReopenStateRow>(
    `
      SELECT
        id,
        status,
        ${hasArchivedAt ? 'archived_at' : 'NULL'} AS archivedAt,
        ${hasRestorationDate ? 'restoration_date' : 'NULL'} AS restorationDate
      FROM support_isolations
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  return row ?? null
}

async function buildIsolationReopenAssignments(normalizedReopenNote: string) {
  const [hasStatus, hasRestorationDate, hasCloseNote, hasIsArchived, hasArchivedAt, hasUpdatedAt] =
    await Promise.all([
      hasReviewDbColumn('support_isolations', 'status'),
      hasReviewDbColumn('support_isolations', 'restoration_date'),
      hasReviewDbColumn('support_isolations', 'close_note'),
      hasReviewDbColumn('support_isolations', 'is_archived'),
      hasReviewDbColumn('support_isolations', 'archived_at'),
      hasReviewDbColumn('support_isolations', 'updated_at'),
    ])

  if (!hasStatus) {
    throw new Error('Schema inti support_isolations belum siap. Kolom status wajib tersedia.')
  }

  const assignments = [`status = 'OPEN'`]
  const values: unknown[] = []

  if (hasRestorationDate) {
    assignments.push('restoration_date = NULL')
  }
  if (hasCloseNote) {
    assignments.push('close_note = ?')
    values.push(normalizedReopenNote)
  }
  if (hasIsArchived) {
    assignments.push('is_archived = 0')
  }
  if (hasArchivedAt) {
    assignments.push('archived_at = NULL')
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
    values,
  }
}

async function buildDismantleQueueInsertPayload(params: {
  isolationId: number
  transferNote: string
  username: string
  reopenedNote: string
}) {
  const [hasIsolationId, hasTransferNote, hasTransferredByUsername, hasReopenedNote] = await Promise.all([
    hasReviewDbColumn('support_dismantle_queue', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
    hasReviewDbColumn('support_dismantle_queue', 'transferred_by_username'),
    hasReviewDbColumn('support_dismantle_queue', 'reopened_note'),
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
  if (hasReopenedNote) {
    columns.push('reopened_note')
    values.push(params.reopenedNote)
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

    const isolationState = await getIsolationReopenState(history.isolationId)
    if (!isolationState) {
      return Response.json({ message: 'Data isolir asal histori dismantle tidak ditemukan.' }, { status: 404 })
    }
    const normalizedIsolationStatus = normalizeRequiredText(isolationState.status).toUpperCase()
    if (
      normalizedIsolationStatus === 'OPEN' &&
      !isolationState.archivedAt &&
      !isolationState.restorationDate
    ) {
      return Response.json(
        { message: `Isolir ${history.isolationId} sudah aktif dan tidak perlu dibuka ulang.` },
        { status: 409 },
      )
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
    const isolationReopenPayload = await buildIsolationReopenAssignments(normalizedReopenNote)
    const queueInsertPayload = await buildDismantleQueueInsertPayload({
      isolationId: history.isolationId,
      transferNote: normalizedReopenNote,
      username: session.username,
      reopenedNote: normalizedReopenNote,
    })

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          UPDATE support_isolations
          SET
            ${isolationReopenPayload.assignments.join(',\n            ')}
          WHERE id = ?
        `,
        [...isolationReopenPayload.values, history.isolationId],
      )

      await connection.query(
        `
          INSERT INTO support_dismantle_queue (
            ${queueInsertPayload.columns.join(',\n            ')}
          )
          VALUES (${queueInsertPayload.placeholders.join(', ')})
        `,
        queueInsertPayload.values,
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
