import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { extractInventoryItemCodeFromScan } from '@/lib/inventory-barcode-utils'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureInventoryDeviceLifecycleTable, type DeviceLifecycleStatus } from '@/lib/services/device-lifecycle-service'

const allowedStatuses = new Set<DeviceLifecycleStatus>([
  'INVENTORY',
  'NOC',
  'TEAM_PSB',
  'TEAM_TROUBLESHOOTS',
  'REPLACE',
  'PENDING_NOC_VALIDATION',
  'INSTALLED',
  'DAMAGED',
  'RETURNED',
])

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function canWriteDeviceLifecycle(role: Parameters<typeof canPerformAction>[0]) {
  return (
    role === 'FIELD_TECHNICIAN' ||
    canPerformAction(role, 'inventory', 'update') ||
    canPerformAction(role, 'inventory', 'create') ||
    canPerformAction(role, 'support', 'update')
  )
}

function inferEventType(status: DeviceLifecycleStatus) {
  switch (status) {
    case 'INVENTORY':
      return 'INVENTORY_INPUT'
    case 'NOC':
      return 'NOC_CHECKIN'
    case 'TEAM_PSB':
    case 'TEAM_TROUBLESHOOTS':
      return 'TECHNICIAN_DELEGATION'
    case 'REPLACE':
      return 'REPLACE_CAPTURED'
    case 'PENDING_NOC_VALIDATION':
      return 'TECHNICIAN_SCAN'
    case 'INSTALLED':
    case 'DAMAGED':
    case 'RETURNED':
      return 'NOC_VALIDATION'
    default:
      return 'MANUAL_UPDATE'
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canWriteDeviceLifecycle(session.role)) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Log lifecycle device hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemValue?: unknown
      lifecycleStatus?: unknown
      workOrderId?: unknown
      troubleTicketId?: unknown
      targetTeam?: unknown
      notes?: unknown
      scanSource?: unknown
    }

    const itemValue = String(payload.itemValue ?? '').trim()
    const lifecycleStatus = String(payload.lifecycleStatus ?? '').trim().toUpperCase() as DeviceLifecycleStatus
    const workOrderId = Number.parseInt(String(payload.workOrderId ?? '').trim(), 10)
    const troubleTicketId = Number.parseInt(String(payload.troubleTicketId ?? '').trim(), 10)
    const targetTeam = String(payload.targetTeam ?? '').trim()
    const notes = String(payload.notes ?? '').trim()
    const scanSource = String(payload.scanSource ?? 'BARCODE').trim().toUpperCase()

    const itemCode = extractInventoryItemCodeFromScan(itemValue)

    if (!itemCode) {
      return Response.json({ message: 'Barcode atau kode item inventory tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(lifecycleStatus)) {
      return Response.json({ message: 'Status lifecycle device tidak valid.' }, { status: 400 })
    }
    if ((!Number.isInteger(workOrderId) || workOrderId <= 0) && (!Number.isInteger(troubleTicketId) || troubleTicketId <= 0)) {
      return Response.json({ message: 'Konteks Work Order atau Trouble Ticket wajib ada.' }, { status: 400 })
    }
    if ((lifecycleStatus === 'TEAM_PSB' || lifecycleStatus === 'TEAM_TROUBLESHOOTS') && !targetTeam) {
      return Response.json({ message: 'Target tim / teknisi wajib diisi untuk aksi delegasi.' }, { status: 400 })
    }

    await ensureInventoryDeviceLifecycleTable()

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id AS id,
          item_code AS itemCode,
          item_name AS itemName
        FROM inventory_items
        WHERE UPPER(item_code) = ?
        LIMIT 1
      `,
      [itemCode],
    )
    if (!item) {
      return Response.json({ message: `Item ${itemCode} tidak ditemukan di inventory.` }, { status: 404 })
    }

    const actorName = `${session.displayName} (${session.username})`
    const normalizedWorkOrderId = Number.isInteger(workOrderId) && workOrderId > 0 ? workOrderId : null
    const normalizedTroubleTicketId = Number.isInteger(troubleTicketId) && troubleTicketId > 0 ? troubleTicketId : null

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO inventory_device_lifecycle_logs (
          inventory_item_id,
          work_order_id,
          trouble_ticket_id,
          lifecycle_status,
          event_type,
          scan_source,
          target_team,
          notes,
          actor_user_id,
          actor_name,
          actor_role,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        item.id,
        normalizedWorkOrderId,
        normalizedTroubleTicketId,
        lifecycleStatus,
        inferEventType(lifecycleStatus),
        scanSource || null,
        targetTeam || null,
        notes || null,
        null,
        actorName,
        session.role,
      ],
    )

    return Response.json({
      message: `Lifecycle ${item.itemCode} (${item.itemName}) berhasil dicatat ke status ${lifecycleStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
