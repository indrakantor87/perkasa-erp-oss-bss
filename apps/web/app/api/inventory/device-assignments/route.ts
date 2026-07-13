import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

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

async function getSubscriptionQueryParts() {
  const [hasCustomerId] = await Promise.all([hasReviewDbColumn('service_subscriptions', 'customer_id')])

  return {
    customerIdExpression: hasCustomerId ? 'customer_id' : 'NULL',
  }
}

async function buildDeviceAssignmentInsertPayload(params: {
  subscriptionId: number | null
  workOrderId: number | null
  inventoryItemId: number
  customerId: number | null
  serialNumber: string | null
  macAddress: string | null
  assignmentStatus: string
  notes: string
}) {
  const [
    hasSubscriptionId,
    hasWorkOrderId,
    hasInventoryItemId,
    hasCustomerId,
    hasSerialNumber,
    hasMacAddress,
    hasAssignmentStatus,
    hasAssignedAt,
    hasReturnedAt,
    hasNotes,
  ] = await Promise.all([
    hasReviewDbColumn('service_device_assignments', 'subscription_id'),
    hasReviewDbColumn('service_device_assignments', 'work_order_id'),
    hasReviewDbColumn('service_device_assignments', 'inventory_item_id'),
    hasReviewDbColumn('service_device_assignments', 'customer_id'),
    hasReviewDbColumn('service_device_assignments', 'serial_number'),
    hasReviewDbColumn('service_device_assignments', 'mac_address'),
    hasReviewDbColumn('service_device_assignments', 'assignment_status'),
    hasReviewDbColumn('service_device_assignments', 'assigned_at'),
    hasReviewDbColumn('service_device_assignments', 'returned_at'),
    hasReviewDbColumn('service_device_assignments', 'notes'),
  ])

  if (!hasInventoryItemId || !hasAssignmentStatus) {
    throw new Error('Schema inti service_device_assignments belum siap. Kolom inventory_item_id dan assignment_status wajib tersedia.')
  }

  const columns = ['inventory_item_id', 'assignment_status']
  const values: unknown[] = [params.inventoryItemId, params.assignmentStatus]

  if (hasSubscriptionId) {
    columns.push('subscription_id')
    values.push(params.subscriptionId)
  }
  if (hasWorkOrderId) {
    columns.push('work_order_id')
    values.push(params.workOrderId)
  }
  if (hasCustomerId) {
    columns.push('customer_id')
    values.push(params.customerId)
  }
  if (hasSerialNumber) {
    columns.push('serial_number')
    values.push(params.serialNumber)
  }
  if (hasMacAddress) {
    columns.push('mac_address')
    values.push(params.macAddress)
  }
  if (hasAssignedAt) {
    columns.push('assigned_at')
    values.push(new Date())
  }
  if (hasReturnedAt) {
    columns.push('returned_at')
    values.push(null)
  }
  if (hasNotes) {
    columns.push('notes')
    values.push(params.notes)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildInventoryStockMovementInsertPayload(params: {
  itemId: number
  workOrderId: number | null
  referenceNo: string
  noteText: string
}) {
  const [hasItemId, hasWorkOrderId, hasMovementType, hasReferenceNo, hasQty, hasUnitPrice, hasNotes, hasMovementAt] =
    await Promise.all([
      hasReviewDbColumn('inventory_stock_movements', 'item_id'),
      hasReviewDbColumn('inventory_stock_movements', 'work_order_id'),
      hasReviewDbColumn('inventory_stock_movements', 'movement_type'),
      hasReviewDbColumn('inventory_stock_movements', 'reference_no'),
      hasReviewDbColumn('inventory_stock_movements', 'qty'),
      hasReviewDbColumn('inventory_stock_movements', 'unit_price'),
      hasReviewDbColumn('inventory_stock_movements', 'notes'),
      hasReviewDbColumn('inventory_stock_movements', 'movement_at'),
    ])

  if (!hasItemId || !hasMovementType || !hasQty) {
    return null
  }

  const columns = ['item_id', 'movement_type', 'qty']
  const values: unknown[] = [params.itemId, 'OUT', 1]

  if (hasWorkOrderId) {
    columns.push('work_order_id')
    values.push(params.workOrderId)
  }
  if (hasReferenceNo) {
    columns.push('reference_no')
    values.push(params.referenceNo)
  }
  if (hasUnitPrice) {
    columns.push('unit_price')
    values.push(0)
  }
  if (hasNotes) {
    columns.push('notes')
    values.push(params.noteText)
  }
  if (hasMovementAt) {
    columns.push('movement_at')
    values.push(new Date())
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildInventoryItemStockUpdatePayload() {
  const [hasCurrentStock, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('inventory_items', 'current_stock'),
    hasReviewDbColumn('inventory_items', 'updated_at'),
  ])

  if (!hasCurrentStock) {
    return null
  }

  const assignments = ['current_stock = current_stock - 1']

  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
  }
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
      const subscriptionQueryParts = await getSubscriptionQueryParts()
      const [subscription] = await runReviewDbQuery<SubscriptionRow>(
        `
          SELECT id, service_no AS serviceNo, ${subscriptionQueryParts.customerIdExpression} AS customerId
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
    const deviceAssignmentInsertPayload = await buildDeviceAssignmentInsertPayload({
      subscriptionId,
      workOrderId,
      inventoryItemId: item.id,
      customerId: resolvedCustomerId,
      serialNumber: serialNumber || null,
      macAddress: macAddress || null,
      assignmentStatus,
      notes: noteText,
    })

    const insert = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO service_device_assignments (
          ${deviceAssignmentInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${deviceAssignmentInsertPayload.placeholders.join(', ')})
      `,
      deviceAssignmentInsertPayload.values,
    )

    const assignmentId = Number(insert.insertId ?? 0)
    if (!assignmentId) {
      return Response.json({ message: 'Device assignment gagal dibuat di review DB.' }, { status: 500 })
    }

    if (assignmentStatus === 'ASSIGNED') {
      const inventoryStockMovementInsertPayload = await buildInventoryStockMovementInsertPayload({
        itemId: item.id,
        workOrderId,
        referenceNo: workOrderNo || serviceNo || `ASSIGN-${assignmentId}`,
        noteText,
      })

      if (inventoryStockMovementInsertPayload) {
        await runReviewDbExecute<InsertResult>(
          `
            INSERT INTO inventory_stock_movements (
              ${inventoryStockMovementInsertPayload.columns.join(',\n              ')}
            )
            VALUES (${inventoryStockMovementInsertPayload.placeholders.join(', ')})
          `,
          inventoryStockMovementInsertPayload.values,
        )
      }

      const inventoryItemStockUpdatePayload = await buildInventoryItemStockUpdatePayload()

      if (inventoryItemStockUpdatePayload) {
        await runReviewDbExecute<InsertResult>(
          `
            UPDATE inventory_items
            SET
              ${inventoryItemStockUpdatePayload.assignments.join(',\n              ')}
            WHERE id = ?
          `,
          [item.id],
        )
      }
    }

    return Response.json({
      message: `Device assignment ${item.itemCode} (${item.itemName}) berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
