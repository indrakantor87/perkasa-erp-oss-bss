import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedNextStatuses = new Set(['RETURNED', 'DAMAGED', 'LOST'])

type AssignmentRow = {
  id: number
  assignmentStatus: string
  inventoryItemId: number
  itemCode: string
  itemName: string
  workOrderId: number | null
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizeStatus(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action return perangkat hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      assignmentId?: unknown
      nextStatus?: unknown
      notes?: unknown
    }

    const assignmentId = Number(payload.assignmentId)
    const nextStatus = normalizeStatus(payload.nextStatus)
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return Response.json({ message: 'Assignment id tidak valid.' }, { status: 400 })
    }
    if (!allowedNextStatuses.has(nextStatus)) {
      return Response.json({ message: 'Status assignment tidak valid.' }, { status: 400 })
    }

    const [assignment] = await runReviewDbQuery<AssignmentRow>(
      `
        SELECT
          sda.id,
          sda.assignment_status AS assignmentStatus,
          sda.inventory_item_id AS inventoryItemId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          sda.work_order_id AS workOrderId
        FROM service_device_assignments sda
        JOIN inventory_items ii
          ON ii.id = sda.inventory_item_id
        WHERE sda.id = ?
        LIMIT 1
      `,
      [assignmentId],
    )
    if (!assignment) {
      return Response.json({ message: 'Device assignment tidak ditemukan di review DB.' }, { status: 404 })
    }

    const currentStatus = normalizeStatus(assignment.assignmentStatus)
    if (currentStatus !== 'ASSIGNED') {
      return Response.json({ message: `Device assignment sudah berstatus ${currentStatus}.` }, { status: 409 })
    }

    const noteText = `[Return Device] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE service_device_assignments
        SET
          assignment_status = ?,
          returned_at = CURRENT_TIMESTAMP,
          notes = CASE
            WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextStatus, noteText, noteText, assignment.id],
    )

    if (nextStatus === 'RETURNED') {
      await runReviewDbExecute<InsertResult>(
        `
          INSERT INTO inventory_stock_movements (
            item_id,
            work_order_id,
            movement_type,
            reference_no,
            qty,
            unit_price,
            notes,
            movement_at
          )
          VALUES (?, ?, 'IN', ?, 1, 0, ?, CURRENT_TIMESTAMP)
        `,
        [assignment.inventoryItemId, assignment.workOrderId, `RETURN-${assignment.id}`, noteText],
      )

      await runReviewDbExecute<InsertResult>(
        `
          UPDATE inventory_items
          SET
            current_stock = current_stock + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [assignment.inventoryItemId],
      )
    }

    return Response.json({
      message: `Device assignment ${assignment.itemCode} (${assignment.itemName}) berhasil diubah ke status ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

