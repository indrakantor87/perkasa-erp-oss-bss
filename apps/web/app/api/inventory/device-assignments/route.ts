import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['ASSIGNED', 'RETURNED', 'DAMAGED', 'LOST'])

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  currentStock: number
}

type SubscriptionRow = {
  id: number
  serviceNo: string
  customerId: number
}

type WorkOrderRow = {
  id: number
  workOrderNo: string
}

type CustomerRow = {
  id: number
  customerCode: string
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
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
      { message: 'Write action device assignment hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      serviceNo?: unknown
      workOrderNo?: unknown
      customerCode?: unknown
      serialNumber?: unknown
      macAddress?: unknown
      assignmentStatus?: unknown
      notes?: unknown
    }

    const itemCode = String(payload.itemCode ?? '').trim()
    const serviceNo = String(payload.serviceNo ?? '').trim()
    const workOrderNo = String(payload.workOrderNo ?? '').trim()
    const customerCode = String(payload.customerCode ?? '').trim()
    const serialNumber = String(payload.serialNumber ?? '').trim()
    const macAddress = String(payload.macAddress ?? '').trim()
    const assignmentStatus = String(payload.assignmentStatus ?? '').trim().toUpperCase()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!allowedStatuses.has(assignmentStatus)) {
      return Response.json({ message: 'Status assignment tidak valid.' }, { status: 400 })
    }
    if (!serviceNo && !workOrderNo && !customerCode) {
      return Response.json(
        { message: 'Minimal isi salah satu: service no, work order no, atau customer code.' },
        { status: 400 },
      )
    }

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          current_stock AS currentStock
        FROM inventory_items
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [itemCode],
    )
    if (!item) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }

    let subscriptionId: number | null = null
    let workOrderId: number | null = null
    let resolvedCustomerId: number | null = null

    if (serviceNo) {
      const [subscription] = await runReviewDbQuery<SubscriptionRow>(
        `
          SELECT id, service_no AS serviceNo, customer_id AS customerId
          FROM service_subscriptions
          WHERE UPPER(service_no) = UPPER(?)
          LIMIT 1
        `,
        [serviceNo],
      )
      if (!subscription) {
        return Response.json({ message: 'Service no tidak ditemukan di review DB.' }, { status: 404 })
      }
      subscriptionId = subscription.id
      resolvedCustomerId = subscription.customerId
    }

    if (workOrderNo) {
      const [workOrder] = await runReviewDbQuery<WorkOrderRow>(
        `
          SELECT id, work_order_no AS workOrderNo
          FROM service_work_orders
          WHERE UPPER(work_order_no) = UPPER(?)
          LIMIT 1
        `,
        [workOrderNo],
      )
      if (!workOrder) {
        return Response.json({ message: 'Work order no tidak ditemukan di review DB.' }, { status: 404 })
      }
      workOrderId = workOrder.id
    }

    if (customerCode) {
      const [customer] = await runReviewDbQuery<CustomerRow>(
        `
          SELECT id, customer_code AS customerCode
          FROM crm_customers
          WHERE UPPER(customer_code) = UPPER(?)
          LIMIT 1
        `,
        [customerCode],
      )
      if (!customer) {
        return Response.json({ message: 'Customer code tidak ditemukan di review DB.' }, { status: 404 })
      }
      resolvedCustomerId = customer.id
    }

    if (assignmentStatus === 'ASSIGNED' && item.currentStock <= 0) {
      return Response.json({ message: 'Stok item tidak cukup untuk assignment.' }, { status: 400 })
    }

    const noteText = `[Assign Device] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`

    const insert = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO service_device_assignments (
          subscription_id,
          work_order_id,
          inventory_item_id,
          customer_id,
          serial_number,
          mac_address,
          assignment_status,
          assigned_at,
          returned_at,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL, ?)
      `,
      [
        subscriptionId,
        workOrderId,
        item.id,
        resolvedCustomerId,
        serialNumber || null,
        macAddress || null,
        assignmentStatus,
        noteText,
      ],
    )

    const assignmentId = Number(insert.insertId ?? 0)
    if (!assignmentId) {
      return Response.json({ message: 'Device assignment gagal dibuat di review DB.' }, { status: 500 })
    }

    if (assignmentStatus === 'ASSIGNED') {
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
          VALUES (?, ?, 'OUT', ?, 1, 0, ?, CURRENT_TIMESTAMP)
        `,
        [item.id, workOrderId, workOrderNo || serviceNo || `ASSIGN-${assignmentId}`, noteText],
      )

      await runReviewDbExecute<InsertResult>(
        `
          UPDATE inventory_items
          SET
            current_stock = current_stock - 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [item.id],
      )
    }

    return Response.json({
      message: `Device assignment ${item.itemCode} (${item.itemName}) berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

