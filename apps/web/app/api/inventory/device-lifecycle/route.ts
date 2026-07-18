import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { extractInventoryItemCodeFromScan } from '@/lib/inventory-barcode-utils'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { resolveReviewAuthUserIdByUsername } from '@/lib/services/field-ops-service'
import {
  ensureInventoryDeviceLifecycleTable,
  getAllowedNextDeviceLifecycleStatuses,
  getLatestDeviceLifecycleLogForItem,
  inferDeviceLifecycleEventType,
  isDelegationLifecycleStatus,
  needsHandoverProofLifecycleStatus,
  normalizeDeviceLifecycleHandoverProofType,
  normalizeDeviceLifecycleStatus,
  type DeviceLifecycleStatus,
  type DeviceLifecycleHandoverProofType,
  type DeviceLifecycleTicketType,
  type DeviceLifecycleValidationStatus,
} from '@/lib/services/device-lifecycle-service'

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
}

type WorkOrderContextRow = {
  id: number
  workOrderNo: string | null
  jobCategory: string | null
}

type TroubleTicketContextRow = {
  id: number
  ticketCode: string | null
  type: string | null
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

function inferTicketTypeFromWorkOrderJobCategory(value: string | null | undefined): DeviceLifecycleTicketType {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) {
    return 'UNKNOWN'
  }
  if (normalized.includes('DISMANTLE')) {
    return 'DISMANTLE'
  }
  if (normalized.includes('JALUR') || normalized.includes('EXPAN') || normalized.includes('JOINTER') || normalized.includes('BACKBONE')) {
    return 'JALUR'
  }
  if (normalized.includes('TROUBLE') || normalized.includes('GANGGUAN')) {
    return 'TROUBLESHOOTS'
  }
  if (normalized.includes('PSB') || normalized.includes('INSTALL') || normalized.includes('PASANG')) {
    return 'PSB'
  }
  return 'UNKNOWN'
}

function normalizeTicketType(value: string | null | undefined): DeviceLifecycleTicketType | null {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) {
    return null
  }
  if (normalized === 'PSB') return 'PSB'
  if (normalized === 'TROUBLESHOOTS' || normalized === 'TROUBLE' || normalized === 'TT') return 'TROUBLESHOOTS'
  if (normalized === 'JALUR') return 'JALUR'
  if (normalized === 'DISMANTLE') return 'DISMANTLE'
  if (normalized === 'UNKNOWN') return 'UNKNOWN'
  return null
}

function resolveLocationSnapshot(params: {
  lifecycleStatus: DeviceLifecycleStatus
  targetTeam: string
  locationCode: string
  locationName: string
  previousLocationName?: string | null
}) {
  if (params.locationCode || params.locationName) {
    return {
      locationCode: params.locationCode || null,
      locationName: params.locationName || null,
    }
  }

  switch (params.lifecycleStatus) {
    case 'INVENTORY':
      return { locationCode: 'INVENTORY', locationName: 'Inventory / GA' }
    case 'NOC':
      return { locationCode: 'NOC', locationName: 'NOC' }
    case 'TEAM_PSB':
      return { locationCode: 'TEAM_PSB', locationName: params.targetTeam || 'Team Teknisi PSB' }
    case 'TEAM_TROUBLESHOOTS':
      return { locationCode: 'TEAM_TROUBLESHOOTS', locationName: params.targetTeam || 'Team Troubleshoots' }
    case 'TEAM_JALUR':
      return { locationCode: 'TEAM_JALUR', locationName: params.targetTeam || 'Team Jalur' }
    case 'TEAM_DISMANTLE':
      return { locationCode: 'TEAM_DISMANTLE', locationName: params.targetTeam || 'Team Dismantle' }
    case 'REPLACE':
    case 'REPLACE_OLD':
      return { locationCode: 'REPLACE_OLD', locationName: params.previousLocationName || 'Lokasi Replace Device Lama' }
    case 'REPLACE_NEW':
      return { locationCode: 'REPLACE_NEW', locationName: params.targetTeam || 'Perangkat Pengganti' }
    case 'PENDING_NOC_VALIDATION':
      return { locationCode: 'PENDING_NOC_VALIDATION', locationName: 'Pending Validasi NOC' }
    case 'INSTALLED':
      return { locationCode: 'INSTALLED', locationName: 'Site Pelanggan / Terpasang' }
    case 'DAMAGED':
      return { locationCode: 'DAMAGED', locationName: 'Rusak / Perlu Pemeriksaan' }
    case 'RETURNED':
      return { locationCode: 'RETURNED', locationName: 'Return ke NOC / Inventory' }
    default:
      return { locationCode: null, locationName: null }
  }
}

function resolveValidationStatus(lifecycleStatus: DeviceLifecycleStatus): DeviceLifecycleValidationStatus {
  if (lifecycleStatus === 'PENDING_NOC_VALIDATION') {
    return 'PENDING'
  }
  if (lifecycleStatus === 'INSTALLED') {
    return 'APPROVED'
  }
  if (lifecycleStatus === 'DAMAGED' || lifecycleStatus === 'RETURNED') {
    return 'REJECTED'
  }
  return 'NOT_REQUIRED'
}

function resolveSuggestedHandoverLabels(params: {
  lifecycleStatus: DeviceLifecycleStatus
  targetTeam: string
  previousTargetTeam?: string | null
}) {
  const { lifecycleStatus, targetTeam, previousTargetTeam = null } = params

  switch (lifecycleStatus) {
    case 'NOC':
      return {
        fromLabel: previousTargetTeam || 'Inventory / GA',
        toLabel: 'NOC',
      }
    case 'RETURNED':
      return {
        fromLabel: previousTargetTeam || targetTeam || 'Team Teknisi',
        toLabel: 'NOC / Inventory',
      }
    case 'TEAM_PSB':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Teknisi PSB',
      }
    case 'TEAM_TROUBLESHOOTS':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Troubleshoots',
      }
    case 'TEAM_JALUR':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Jalur',
      }
    case 'TEAM_DISMANTLE':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Dismantle',
      }
    default:
      return {
        fromLabel: '',
        toLabel: '',
      }
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
      relatedItemValue?: unknown
      lifecycleStatus?: unknown
      workOrderId?: unknown
      troubleTicketId?: unknown
      ticketType?: unknown
      ticketRef?: unknown
      targetTeam?: unknown
      locationCode?: unknown
      locationName?: unknown
      handoverFromLabel?: unknown
      handoverToLabel?: unknown
      handoverProofType?: unknown
      handoverProofRef?: unknown
      notes?: unknown
      scanSource?: unknown
    }

    const itemValue = String(payload.itemValue ?? '').trim()
    const relatedItemValue = String(payload.relatedItemValue ?? '').trim()
    const lifecycleStatus = normalizeDeviceLifecycleStatus(String(payload.lifecycleStatus ?? '').trim())
    const workOrderId = Number.parseInt(String(payload.workOrderId ?? '').trim(), 10)
    const troubleTicketId = Number.parseInt(String(payload.troubleTicketId ?? '').trim(), 10)
    const requestedTicketType = normalizeTicketType(String(payload.ticketType ?? '').trim())
    const requestedTicketRef = String(payload.ticketRef ?? '').trim()
    const targetTeam = String(payload.targetTeam ?? '').trim()
    const locationCode = String(payload.locationCode ?? '').trim()
    const locationName = String(payload.locationName ?? '').trim()
    const handoverFromLabel = String(payload.handoverFromLabel ?? '').trim()
    const handoverToLabel = String(payload.handoverToLabel ?? '').trim()
    const handoverProofType = normalizeDeviceLifecycleHandoverProofType(String(payload.handoverProofType ?? '').trim())
    const handoverProofRef = String(payload.handoverProofRef ?? '').trim()
    const notes = String(payload.notes ?? '').trim()
    const scanSource = String(payload.scanSource ?? 'BARCODE').trim().toUpperCase()

    const itemCode = extractInventoryItemCodeFromScan(itemValue)
    const relatedItemCode = extractInventoryItemCodeFromScan(relatedItemValue)

    if (!itemCode) {
      return Response.json({ message: 'Barcode atau kode item inventory tidak valid.' }, { status: 400 })
    }
    if (!lifecycleStatus) {
      return Response.json({ message: 'Status lifecycle device tidak valid.' }, { status: 400 })
    }
    if ((!Number.isInteger(workOrderId) || workOrderId <= 0) && (!Number.isInteger(troubleTicketId) || troubleTicketId <= 0)) {
      return Response.json({ message: 'Konteks Work Order atau Trouble Ticket wajib ada.' }, { status: 400 })
    }
    if (isDelegationLifecycleStatus(lifecycleStatus) && !targetTeam) {
      return Response.json({ message: 'Target tim / teknisi wajib diisi untuk aksi delegasi.' }, { status: 400 })
    }
    if ((lifecycleStatus === 'REPLACE_OLD' || lifecycleStatus === 'REPLACE_NEW') && !relatedItemCode) {
      return Response.json(
        { message: 'Barcode pasangan replace wajib diisi untuk status REPLACE_OLD atau REPLACE_NEW.' },
        { status: 400 },
      )
    }

    await ensureInventoryDeviceLifecycleTable()

    const [item, relatedItem] = await Promise.all([
      runReviewDbQuery<ItemRow>(
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
      ).then((rows) => rows[0] ?? null),
      relatedItemCode
        ? runReviewDbQuery<ItemRow>(
            `
              SELECT
                id AS id,
                item_code AS itemCode,
                item_name AS itemName
              FROM inventory_items
              WHERE UPPER(item_code) = ?
              LIMIT 1
            `,
            [relatedItemCode],
          ).then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ])
    if (!item) {
      return Response.json({ message: `Item ${itemCode} tidak ditemukan di inventory.` }, { status: 404 })
    }
    if (relatedItemCode && !relatedItem) {
      return Response.json({ message: `Item pasangan ${relatedItemCode} tidak ditemukan di inventory.` }, { status: 404 })
    }
    if (relatedItem && relatedItem.id === item.id) {
      return Response.json(
        { message: 'Device utama dan device pasangan replace tidak boleh item yang sama.' },
        { status: 400 },
      )
    }

    const normalizedWorkOrderId = Number.isInteger(workOrderId) && workOrderId > 0 ? workOrderId : null
    const normalizedTroubleTicketId = Number.isInteger(troubleTicketId) && troubleTicketId > 0 ? troubleTicketId : null

    const [workOrderContext, troubleTicketContext, latestLifecycle, actorUserId] = await Promise.all([
      normalizedWorkOrderId
        ? (
            await runReviewDbQuery<WorkOrderContextRow>(
              `
                SELECT
                  id AS id,
                  work_order_no AS workOrderNo,
                  job_category AS jobCategory
                FROM service_work_orders
                WHERE id = ?
                LIMIT 1
              `,
              [normalizedWorkOrderId],
            )
          )[0] ?? null
        : null,
      normalizedTroubleTicketId
        ? (
            await runReviewDbQuery<TroubleTicketContextRow>(
              `
                SELECT
                  id AS id,
                  ticket_code AS ticketCode,
                  type AS type
                FROM support_trouble_tickets
                WHERE id = ?
                LIMIT 1
              `,
              [normalizedTroubleTicketId],
            )
          )[0] ?? null
        : null,
      getLatestDeviceLifecycleLogForItem(item.id),
      resolveReviewAuthUserIdByUsername(session.username),
    ])

    if (normalizedWorkOrderId && !workOrderContext) {
      return Response.json({ message: `Work Order #${normalizedWorkOrderId} tidak ditemukan.` }, { status: 404 })
    }
    if (normalizedTroubleTicketId && !troubleTicketContext) {
      return Response.json({ message: `Trouble Ticket #${normalizedTroubleTicketId} tidak ditemukan.` }, { status: 404 })
    }

    const latestLog = latestLifecycle.item
    const previousStatus = latestLog?.lifecycleStatus ? normalizeDeviceLifecycleStatus(latestLog.lifecycleStatus) : null
    const allowedTransitions = getAllowedNextDeviceLifecycleStatuses(previousStatus)

    if (previousStatus === lifecycleStatus) {
      return Response.json(
        {
          message: `Item ${item.itemCode} sudah berada pada status ${lifecycleStatus}. Gunakan status berikutnya agar timeline lifecycle tetap rapi.`,
        },
        { status: 409 },
      )
    }

    if (!allowedTransitions.includes(lifecycleStatus)) {
      return Response.json(
        {
          message: `Transisi lifecycle ${previousStatus ?? 'START'} -> ${lifecycleStatus} tidak diizinkan. Lanjutkan dengan salah satu status berikut: ${allowedTransitions.join(', ')}.`,
        },
        { status: 409 },
      )
    }

    const latestHasDifferentContext =
      latestLog &&
      ((latestLog.workOrderId && latestLog.workOrderId !== normalizedWorkOrderId) ||
        (latestLog.troubleTicketId && latestLog.troubleTicketId !== normalizedTroubleTicketId))

    if (latestHasDifferentContext && previousStatus && !['RETURNED', 'INVENTORY', 'NOC'].includes(previousStatus)) {
      return Response.json(
        {
          message: `Item ${item.itemCode} masih terhubung ke konteks ${latestLog?.ticketRef ?? 'sebelumnya'} pada status ${previousStatus}. Selesaikan return/check-in lebih dulu sebelum pindah ke ticket lain.`,
        },
        { status: 409 },
      )
    }

    let ticketType: DeviceLifecycleTicketType =
      requestedTicketType ??
      (workOrderContext ? inferTicketTypeFromWorkOrderJobCategory(workOrderContext.jobCategory) : null) ??
      (normalizedTroubleTicketId ? 'TROUBLESHOOTS' : null) ??
      'UNKNOWN'

    if (ticketType === 'UNKNOWN' && troubleTicketContext) {
      ticketType = 'TROUBLESHOOTS'
    }

    const ticketRef =
      requestedTicketRef ||
      workOrderContext?.workOrderNo ||
      troubleTicketContext?.ticketCode ||
      (normalizedWorkOrderId ? `WO-${normalizedWorkOrderId}` : normalizedTroubleTicketId ? `TT-${normalizedTroubleTicketId}` : '')

    if ((lifecycleStatus === 'REPLACE' || lifecycleStatus === 'REPLACE_OLD' || lifecycleStatus === 'REPLACE_NEW') && ticketType !== 'TROUBLESHOOTS') {
      return Response.json(
        { message: 'Flow replace device saat ini hanya boleh dipakai untuk ticket Troubleshoots.' },
        { status: 400 },
      )
    }

    const resolvedTargetTeam =
      targetTeam ||
      (isDelegationLifecycleStatus(lifecycleStatus) ? latestLog?.targetTeam ?? '' : latestLog?.targetTeam ?? '')
    const suggestedHandover = resolveSuggestedHandoverLabels({
      lifecycleStatus,
      targetTeam: resolvedTargetTeam,
      previousTargetTeam: latestLog?.targetTeam ?? null,
    })
    const resolvedHandoverFromLabel = handoverFromLabel || suggestedHandover.fromLabel || null
    const resolvedHandoverToLabel = handoverToLabel || suggestedHandover.toLabel || null
    const resolvedHandoverProofType: DeviceLifecycleHandoverProofType | null =
      handoverProofType ?? (needsHandoverProofLifecycleStatus(lifecycleStatus) ? 'BARCODE_SCAN' : null)

    if (needsHandoverProofLifecycleStatus(lifecycleStatus)) {
      if (!resolvedHandoverFromLabel || !resolvedHandoverToLabel || !resolvedHandoverProofType) {
        return Response.json(
          {
            message:
              'Proof serah-terima wajib dilengkapi untuk check-in NOC, delegasi teknisi, atau return. Isi pihak penyerah, penerima, dan jenis bukti.',
          },
          { status: 400 },
        )
      }
    }

    const locationSnapshot = resolveLocationSnapshot({
      lifecycleStatus,
      targetTeam: resolvedTargetTeam,
      locationCode,
      locationName,
      previousLocationName: latestLog?.locationName ?? latestLog?.targetTeam ?? null,
    })
    const actorName = `${session.displayName} (${session.username})`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO inventory_device_lifecycle_logs (
          inventory_item_id,
          related_inventory_item_id,
          work_order_id,
          trouble_ticket_id,
          ticket_type,
          ticket_ref,
          lifecycle_status,
          from_status,
          event_type,
          scan_source,
          target_team,
          location_code,
          location_name,
          validation_status,
          handover_from_label,
          handover_to_label,
          handover_proof_type,
          handover_proof_ref,
          notes,
          actor_user_id,
          actor_name,
          actor_role,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        item.id,
        relatedItem?.id ?? null,
        normalizedWorkOrderId,
        normalizedTroubleTicketId,
        ticketType,
        ticketRef || null,
        lifecycleStatus,
        previousStatus,
        inferDeviceLifecycleEventType({ fromStatus: previousStatus, toStatus: lifecycleStatus }),
        scanSource || null,
        resolvedTargetTeam || null,
        locationSnapshot.locationCode,
        locationSnapshot.locationName,
        resolveValidationStatus(lifecycleStatus),
        resolvedHandoverFromLabel,
        resolvedHandoverToLabel,
        resolvedHandoverProofType,
        handoverProofRef || null,
        notes || null,
        actorUserId,
        actorName,
        session.role,
      ],
    )

    return Response.json({
      message: `Lifecycle ${item.itemCode} (${item.itemName}) berhasil dicatat ke status ${lifecycleStatus}${relatedItem ? ` dengan pasangan ${relatedItem.itemCode}` : ''}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
