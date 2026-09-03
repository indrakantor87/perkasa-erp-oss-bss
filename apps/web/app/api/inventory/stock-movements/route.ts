import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedMovementTypes = new Set(['IN', 'OUT', 'ADJUSTMENT'])
const allowedReferenceTypes = new Set(['WORK_ORDER', 'TROUBLE_TICKET', 'REQUEST', 'MANUAL', 'PURCHASE_RECEIPT'])

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  rackCode: string | null
  rackBarcode: string | null
  currentStock: number
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveNextStock(currentStock: number, qty: number, movementType: string) {
  if (movementType === 'IN') return currentStock + qty
  if (movementType === 'OUT') return currentStock - qty
  return qty
}

function requiresInventoryPickupScan(role: string) {
  return !['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(String(role).trim().toUpperCase())
}

function resolveOptionalPositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function buildHandoverAuditNote(params: {
  handoverFrom?: string
  handoverTo?: string
  handoverProofType?: string
  handoverProofRef?: string
}) {
  const handoverFrom = String(params.handoverFrom ?? '').trim()
  const handoverTo = String(params.handoverTo ?? '').trim()
  const handoverProofType = String(params.handoverProofType ?? '').trim().toUpperCase()
  const handoverProofRef = String(params.handoverProofRef ?? '').trim()

  if (!handoverFrom || !handoverTo) {
    return ''
  }

  const proofParts = [handoverProofType || '-', handoverProofRef || '-'].join(' / ')
  return `[HANDOVER] ${handoverFrom} -> ${handoverTo} | [PROOF] ${proofParts}`
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
      { message: 'Write action stock movement hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      movementType?: unknown
      referenceNo?: unknown
      qty?: unknown
      unitPrice?: unknown
      workOrderId?: unknown
      troubleTicketId?: unknown
      requestId?: unknown
      fromLocationId?: unknown
      toLocationId?: unknown
      technicianUserId?: unknown
      referenceType?: unknown
      notes?: unknown
      handoverFrom?: unknown
      handoverTo?: unknown
      handoverProofType?: unknown
      handoverProofRef?: unknown
      scannedRackBarcode?: unknown
    }

    const itemCode = String(payload.itemCode ?? '').trim()
    const movementType = String(payload.movementType ?? '').trim().toUpperCase()
    const referenceNo = String(payload.referenceNo ?? '').trim()
    const qty = Number.parseInt(String(payload.qty ?? '0').trim() || '0', 10)
    const unitPrice = normalizePrice(payload.unitPrice)
    const workOrderId = resolveOptionalPositiveInt(payload.workOrderId)
    const troubleTicketId = resolveOptionalPositiveInt(payload.troubleTicketId)
    const requestId = resolveOptionalPositiveInt(payload.requestId)
    const fromLocationId = resolveOptionalPositiveInt(payload.fromLocationId)
    const toLocationId = resolveOptionalPositiveInt(payload.toLocationId)
    const technicianUserId = resolveOptionalPositiveInt(payload.technicianUserId)
    const referenceTypeRaw = String(payload.referenceType ?? '').trim().toUpperCase()
    const notes = String(payload.notes ?? '').trim()
    const handoverFrom = String(payload.handoverFrom ?? '').trim()
    const handoverTo = String(payload.handoverTo ?? '').trim()
    const handoverProofType = String(payload.handoverProofType ?? '').trim().toUpperCase()
    const handoverProofRef = String(payload.handoverProofRef ?? '').trim()
    const scannedRackBarcode = String(payload.scannedRackBarcode ?? '').trim().toUpperCase()
    const referenceType =
      referenceTypeRaw && allowedReferenceTypes.has(referenceTypeRaw)
        ? referenceTypeRaw
        : workOrderId
          ? 'WORK_ORDER'
          : troubleTicketId
            ? 'TROUBLE_TICKET'
            : requestId
              ? 'REQUEST'
              : 'MANUAL'

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!allowedMovementTypes.has(movementType)) {
      return Response.json({ message: 'Tipe movement tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty movement tidak valid.' }, { status: 400 })
    }
    if (unitPrice === null || unitPrice < 0) {
      return Response.json({ message: 'Harga satuan tidak valid.' }, { status: 400 })
    }
    if (referenceType === 'WORK_ORDER' && !workOrderId) {
      return Response.json({ message: 'Reference type WORK_ORDER membutuhkan workOrderId.' }, { status: 400 })
    }
    if (referenceType === 'TROUBLE_TICKET' && !troubleTicketId) {
      return Response.json({ message: 'Reference type TROUBLE_TICKET membutuhkan troubleTicketId.' }, { status: 400 })
    }
    if (referenceType === 'REQUEST' && !requestId) {
      return Response.json({ message: 'Reference type REQUEST membutuhkan requestId.' }, { status: 400 })
    }
    if (movementType === 'OUT' && !toLocationId && !technicianUserId && !workOrderId && !troubleTicketId) {
      return Response.json(
        { message: 'Movement OUT wajib memiliki tujuan berupa lokasi, teknisi, work order, atau trouble ticket.' },
        { status: 400 },
      )
    }
    if (movementType === 'OUT' && (handoverFrom || handoverTo || handoverProofRef) && (!handoverFrom || !handoverTo || !handoverProofRef)) {
      return Response.json(
        { message: 'Lengkapi asal, penerima, dan referensi bukti jika movement OUT mencatat handover.' },
        { status: 400 },
      )
    }

    const [hasRackCode, hasRackBarcode, hasWorkOrderId, hasTroubleTicketId, hasRequestId, hasFromLocationId, hasToLocationId, hasTechnicianUserId, hasReferenceType, hasMovementStatus, hasRequestsWorkOrderId, hasRequestsInventoryItemId, hasRequestsStatus] = await Promise.all([
      hasReviewDbColumn('inventory_items', 'rack_code'),
      hasReviewDbColumn('inventory_items', 'rack_barcode'),
      hasReviewDbColumn('inventory_stock_movements', 'work_order_id'),
      hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id'),
      hasReviewDbColumn('inventory_stock_movements', 'request_id'),
      hasReviewDbColumn('inventory_stock_movements', 'from_location_id'),
      hasReviewDbColumn('inventory_stock_movements', 'to_location_id'),
      hasReviewDbColumn('inventory_stock_movements', 'technician_user_id'),
      hasReviewDbColumn('inventory_stock_movements', 'reference_type'),
      hasReviewDbColumn('inventory_stock_movements', 'movement_status'),
      hasReviewDbColumn('inventory_item_requests', 'work_order_id'),
      hasReviewDbColumn('inventory_item_requests', 'inventory_item_id'),
      hasReviewDbColumn('inventory_item_requests', 'request_status'),
    ])

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          ${hasRackCode ? 'rack_code' : 'NULL'} AS rackCode,
          ${hasRackBarcode ? 'rack_barcode' : 'NULL'} AS rackBarcode,
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

    if (referenceType === 'WORK_ORDER' && workOrderId && hasRequestsWorkOrderId && hasRequestsInventoryItemId && hasRequestsStatus) {
      const [activeRequestRows] = await runReviewDbQuery<{ id: number; request_code: string | null; request_status: string | null }>(
        `
          SELECT id, request_code, request_status
          FROM inventory_item_requests
          WHERE work_order_id = ?
            AND inventory_item_id = ?
            AND request_status IN ('REQUEST', 'ON_PROGRESS', 'PENDING')
          LIMIT 1
        `,
        [workOrderId, item.id],
      )
      if (activeRequestRows && Number((activeRequestRows as unknown as Array<unknown>).length ?? 0) > 0) {
        const active = (activeRequestRows as unknown as Array<{ id: number; request_code: string | null }>)[0]
        return Response.json(
          {
            message:
              `Item ${item.itemCode} sudah memiliki permintaan material (${active.request_code ?? '#' + active.id}) yang aktif untuk work order ini. ` +
              `Material requested wajib diproses melalui WO completion / request flow agar tidak double-deducted. Gunakan panel ini hanya untuk material ad-hoc di luar permintaan.`,
            workOrderId,
            inventoryItemId: item.id,
            requestId: active.id,
            requestCode: active.request_code,
          },
          { status: 409 },
        )
      }
    }

    if (movementType === 'OUT' && requiresInventoryPickupScan(session.role)) {
      if (!scannedRackBarcode) {
        return Response.json(
          { message: 'Scan barcode rak wajib dilakukan sebelum movement OUT disimpan.' },
          { status: 400 },
        )
      }
      const expectedRackBarcode = String(item.rackBarcode || item.rackCode || '').trim().toUpperCase()
      if (!expectedRackBarcode) {
        return Response.json(
          { message: `Item ${item.itemCode} belum memiliki barcode rak. Lengkapi dulu data rak di item inventory.` },
          { status: 400 },
        )
      }
      if (scannedRackBarcode !== expectedRackBarcode) {
        return Response.json(
          {
            message: `Barcode rak tidak cocok. Form memilih ${item.itemCode} di rak ${item.rackCode || '-'}, tetapi barcode yang terbaca ${scannedRackBarcode}.`,
          },
          { status: 400 },
        )
      }
    }

    const nextStock = resolveNextStock(item.currentStock, qty, movementType)
    if (movementType === 'OUT' && nextStock < 0) {
      return Response.json({ message: 'Stok tidak cukup untuk movement OUT.' }, { status: 400 })
    }
    if (movementType === 'ADJUSTMENT' && qty < 0) {
      return Response.json({ message: 'Qty adjustment tidak valid.' }, { status: 400 })
    }

    const handoverAuditNote = buildHandoverAuditNote({
      handoverFrom,
      handoverTo,
      handoverProofType,
      handoverProofRef,
    })
    const noteParts = [`[Review Movement] ${session.displayName} (${session.username})`]
    if (notes) {
      noteParts.push(notes)
    }
    if (handoverAuditNote) {
      noteParts.push(handoverAuditNote)
    }
    const noteText = noteParts.join(' - ')
    const columns = ['item_id']
    const values: unknown[] = [item.id]

    if (hasWorkOrderId) {
      columns.push('work_order_id')
      values.push(workOrderId)
    }
    if (hasTroubleTicketId) {
      columns.push('trouble_ticket_id')
      values.push(troubleTicketId)
    }
    if (hasRequestId) {
      columns.push('request_id')
      values.push(requestId)
    }

    columns.push('movement_type')
    values.push(movementType)

    if (hasReferenceType) {
      columns.push('reference_type')
      values.push(referenceType)
    }
    if (hasFromLocationId) {
      columns.push('from_location_id')
      values.push(fromLocationId)
    }
    if (hasToLocationId) {
      columns.push('to_location_id')
      values.push(toLocationId)
    }
    if (hasTechnicianUserId) {
      columns.push('technician_user_id')
      values.push(technicianUserId)
    }

    columns.push('reference_no', 'qty', 'unit_price')
    values.push(referenceNo || null, qty, unitPrice)

    if (hasMovementStatus) {
      columns.push('movement_status')
      values.push('POSTED')
    }

    columns.push('notes', 'movement_at')
    values.push(noteText, new Date())

    const mvInsertResult = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO inventory_stock_movements (
          ${columns.join(',\n          ')}
        )
        VALUES (${columns.map(() => '?').join(', ')})
      `,
      values,
    )
    const mvInsertId = Number(mvInsertResult?.insertId ?? 0) || null

    let stockUpdResult: InsertResult | null = null
    if (movementType === 'OUT' || movementType === 'IN') {
      stockUpdResult = await runReviewDbExecute<InsertResult>(
        `
          UPDATE inventory_items
          SET
            current_stock = ${movementType === 'IN' ? 'current_stock + ?' : 'current_stock - ?'},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            ${movementType === 'OUT' ? 'AND current_stock >= ?' : ''}
        `,
        movementType === 'OUT' ? [qty, item.id, qty] : [qty, item.id],
      )
    } else {
      stockUpdResult = await runReviewDbExecute<InsertResult>(
        `
          UPDATE inventory_items
          SET
            current_stock = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [nextStock, item.id],
      )
    }
    const stockAffected = Number(stockUpdResult?.affectedRows ?? 0)
    if (stockAffected <= 0) {
      if (mvInsertId && mvInsertId > 0 && hasMovementStatus) {
        try {
          await runReviewDbExecute<InsertResult>(
            `
              UPDATE inventory_stock_movements
              SET movement_status = 'REJECTED',
                  notes = CONCAT(COALESCE(notes, ''), ' | [ROLLBACK] stock update failed race guard insufficient qty')
              WHERE id = ?
            `,
            [mvInsertId],
          )
        } catch {
        }
      }
      return Response.json(
        {
          message: movementType === 'OUT'
            ? 'Stok tidak cukup (konkurensi / concurrent deduction). Movement dibatalkan dan tidak memotong stok.'
            : 'Gagal mengupdate stok item inventory.',
          itemCode: item.itemCode,
          qty,
          currentStock: item.currentStock,
        },
        { status: 409 },
      )
    }

    return Response.json({
      message: `Stock movement ${movementType} untuk ${item.itemCode} (${item.itemName}) berhasil disimpan${workOrderId ? ` pada WO #${workOrderId}` : troubleTicketId ? ` pada TT #${troubleTicketId}` : ''}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
