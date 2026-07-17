import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { hasReviewDbColumn, getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import {
  insertServiceWorkOrderStatusLog,
  resolveReviewAuthUserIdByUsername,
} from '@/lib/services/field-ops-service'

type WorkOrderRow = {
  id: number
  workOrderNo: string
  status: string
  notes: string | null
}

type QueueShortcutStatus = 'OPEN' | 'ON_PROGRESS' | 'TEMPORARY' | 'CLOSE'

const allowedShortcutStatuses = new Set<QueueShortcutStatus>(['OPEN', 'ON_PROGRESS', 'TEMPORARY', 'CLOSE'])

function mapQueueShortcutToWorkOrderStatus(status: QueueShortcutStatus) {
  if (status === 'TEMPORARY') {
    return 'PENDING'
  }
  if (status === 'CLOSE') {
    return 'COMPLETED'
  }

  return status
}

function buildShortcutNote(shortcutStatus: QueueShortcutStatus) {
  if (shortcutStatus === 'OPEN') {
    return 'Work order dikembalikan ke antrean open dari meja NOC.'
  }
  if (shortcutStatus === 'ON_PROGRESS') {
    return 'Work order sedang diproses aktif dari meja NOC.'
  }
  if (shortcutStatus === 'TEMPORARY') {
    return 'Work order dipindahkan ke temporary / pending untuk follow-up lanjutan.'
  }

  return 'Work order diselesaikan dari meja NOC.'
}

async function getWorkOrderById(id: number) {
  const [row] = await runReviewDbQuery<WorkOrderRow>(
    `
      SELECT
        id,
        work_order_no AS workOrderNo,
        status,
        notes
      FROM service_work_orders
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  return row ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
      { message: 'Shortcut status work order hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const workOrderId = Number.parseInt(String(resolvedParams.id ?? '').trim(), 10)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return Response.json({ message: 'ID work order tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      queueStatus?: unknown
      notes?: unknown
    }
    const queueStatus = String(payload.queueStatus ?? '').trim().toUpperCase() as QueueShortcutStatus
    const notes = String(payload.notes ?? '').trim()

    if (!allowedShortcutStatuses.has(queueStatus)) {
      return Response.json({ message: 'Status shortcut work order tidak valid.' }, { status: 400 })
    }

    const workOrder = await getWorkOrderById(workOrderId)
    if (!workOrder) {
      return Response.json({ message: 'Work order tidak ditemukan.' }, { status: 404 })
    }

    const targetStatus = mapQueueShortcutToWorkOrderStatus(queueStatus)
    const actorLabel = `${session.displayName} (${session.username})`
    const noteText = `[Queue NOC] ${actorLabel} - ${notes || buildShortcutNote(queueStatus)}`
    const changedByUserId = await resolveReviewAuthUserIdByUsername(session.username)

    const [
      hasNotes,
      hasCompletedAt,
      hasStartedAt,
      hasClosedByUserId,
      hasUpdatedAt,
    ] = await Promise.all([
      hasReviewDbColumn('service_work_orders', 'notes'),
      hasReviewDbColumn('service_work_orders', 'completed_at'),
      hasReviewDbColumn('service_work_orders', 'started_at'),
      hasReviewDbColumn('service_work_orders', 'closed_by_user_id'),
      hasReviewDbColumn('service_work_orders', 'updated_at'),
    ])

    const setClauses = ['status = ?']
    const values: unknown[] = [targetStatus]

    if (hasNotes) {
      setClauses.push(`notes = CASE
        WHEN notes IS NULL OR notes = '' THEN ?
        ELSE CONCAT(notes, '\n', ?)
      END`)
      values.push(noteText, noteText)
    }

    if (hasStartedAt && queueStatus === 'ON_PROGRESS') {
      setClauses.push('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)')
    }
    if (hasCompletedAt) {
      if (queueStatus === 'CLOSE') {
        setClauses.push('completed_at = CURRENT_TIMESTAMP')
      } else {
        setClauses.push('completed_at = NULL')
      }
    }
    if (hasClosedByUserId) {
      setClauses.push('closed_by_user_id = ?')
      values.push(queueStatus === 'CLOSE' ? changedByUserId ?? null : null)
    }
    if (hasUpdatedAt) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP')
    }

    values.push(workOrder.id)

    await runReviewDbExecute(
      `
        UPDATE service_work_orders
        SET ${setClauses.join(',\n          ')}
        WHERE id = ?
      `,
      values,
    )

    await insertServiceWorkOrderStatusLog({
      workOrderId: workOrder.id,
      fromStatus: workOrder.status,
      toStatus: targetStatus,
      changedByUserId,
      reasonCode: 'NOC_QUEUE_SHORTCUT',
      reasonNotes: noteText,
    })

    return Response.json({
      message: `Work order ${workOrder.workOrderNo} berhasil diperbarui ke status ${targetStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
