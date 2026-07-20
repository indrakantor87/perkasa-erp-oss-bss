import { getConfiguredDataMode, getFallbackDataSourceSnapshot, getDataSourceSnapshot } from '@/lib/data-source'
import {
  type DismantleListItem,
  type DismantleListPagePayload,
  type DismantleListQuery,
  type DismantleListStatus,
  type DismantleListTransitionAction,
} from '@/lib/dismantle-list-shared'
import {
  getReviewDbErrorDetail,
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
} from '@/lib/review-db'
import {
  buildServiceWorkOrderInsertPayload,
  ensureServiceWorkOrderStatusLogTable,
  generateServiceWorkOrderNo,
  resolveReviewAuthUserIdByUsername,
} from '@/lib/services/field-ops-service'
import {
  parseStructuredSupportNote,
  SUPPORT_DISMANTLE_METADATA_PREFIXES,
} from '@/lib/services/support-dismantle-service'
import type { AppRole, DataSourceSnapshot } from '@/lib/types'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type ReviewDbDismantleListRow = {
  id: number
  dismantleListCode: string | null
  sourceIsolationRef: string | null
  customerName: string | null
  customerPhone: string | null
  serviceRef: string | null
  addressText: string | null
  odpCode: string | null
  isolationStartedAt: string | null
  eligibleAt: string | null
  status: string | null
  reviewNotes: string | null
  correctionNotes: string | null
  transferredTicketRef: string | null
  transferredWorkOrderId: number | null
  createdAt: string | null
  updatedAt: string | null
  areaLabel: string | null
  csPicName: string | null
  terminationReason: string | null
  nextActionLabel: string | null
}

type ReviewDbAuditRow = {
  eventType: string | null
  toStatus: string | null
  notes: string | null
}

type ReviewDbCountRow = {
  total: number
}

type ReviewDbQueueSourceRow = {
  queueId: number
  isolationId: number
  customerName: string | null
  customerPhone: string | null
  serviceRef: string | null
  addressText: string | null
  odpCode: string | null
  isolationStartedAt: string | null
  eligibleAt: string | null
  transferNote: string | null
  areaLabel: string | null
  terminationReason: string | null
  transferredAt: string | null
}

type ReviewDbExistingListRow = {
  id: number
  status: string | null
  transferredTicketRef: string | null
  transferredWorkOrderId: number | null
}

type ReviewDbHistoryStateRow = {
  historyId: number
  isolationId: number
  closedAt: string | null
  closeNote: string | null
  returnedItemCodes: string | null
}

type ReviewDbWorkOrderInventoryRow = {
  workOrderId: number
  itemCode: string | null
}

const mockDismantleListItems: DismantleListItem[] = [
  {
    id: 201,
    dismantleListCode: 'DML-202607-0001',
    sourceIsolationRef: 'ISO-202606-0041',
    customerName: 'Rudi Hartono',
    customerPhone: '628111223344',
    serviceRef: 'SUB-PTI-01021',
    addressText: 'Jl. Pangeran Diponegoro No. 21, Pati Kota',
    odpCode: 'ODP-PTI-03',
    isolationStartedAt: '2026-06-15T08:00:00+07:00',
    eligibleAt: '2026-07-15T08:00:00+07:00',
    status: 'BARU',
    reviewNotes: null,
    correctionNotes: null,
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    createdAt: '2026-07-19T08:20:00+07:00',
    updatedAt: '2026-07-19T08:20:00+07:00',
    areaLabel: 'Pati Kota',
    csPicName: null,
    terminationReason: 'Isolir aktif melewati 1 bulan, menunggu validasi CS.',
    nextActionLabel: 'Masuk review CS',
    supportHistoryId: null,
    supportClosedAt: null,
    inventoryItemCodes: [],
    auditSummary: ['Dibuat dari isolir 1 bulan', 'Menunggu review CS'],
  },
  {
    id: 202,
    dismantleListCode: 'DML-202607-0002',
    sourceIsolationRef: 'ISO-202606-0048',
    customerName: 'CV Lancar Jaya',
    customerPhone: '62295112233',
    serviceRef: 'SUB-MRG-02011',
    addressText: 'Ruko Margorejo Blok B-12',
    odpCode: 'ODP-MRG-08',
    isolationStartedAt: '2026-06-12T09:15:00+07:00',
    eligibleAt: '2026-07-12T09:15:00+07:00',
    status: 'REVIEW_CS',
    reviewNotes: 'Perlu pastikan customer benar-benar terminasi dan jadwal ambil perangkat tidak bentrok.',
    correctionNotes: null,
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    createdAt: '2026-07-18T10:20:00+07:00',
    updatedAt: '2026-07-19T09:40:00+07:00',
    areaLabel: 'Margorejo',
    csPicName: 'Admin CS Pagi',
    terminationReason: 'Pelanggan tidak melanjutkan layanan setelah isolir lebih dari 30 hari.',
    nextActionLabel: 'Putuskan review',
    supportHistoryId: null,
    supportClosedAt: null,
    inventoryItemCodes: [],
    auditSummary: ['Masuk dari isolir', 'Sedang direview CS'],
  },
  {
    id: 203,
    dismantleListCode: 'DML-202607-0003',
    sourceIsolationRef: 'ISO-202606-0053',
    customerName: 'Siti Aisyah',
    customerPhone: '628123009988',
    serviceRef: 'SUB-TLG-00328',
    addressText: 'Ds. Tlogowungu RT 04 RW 02',
    odpCode: 'ODP-TLG-06',
    isolationStartedAt: '2026-06-10T11:00:00+07:00',
    eligibleAt: '2026-07-10T11:00:00+07:00',
    status: 'PERLU_KOREKSI',
    reviewNotes: 'Nomor kontak aktif dan status perangkat di rumah perlu dipastikan ulang.',
    correctionNotes: 'Lengkapi status ONT/modem yang terakhir terpasang dan PIC yang bisa ditemui saat pengambilan.',
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    createdAt: '2026-07-18T13:05:00+07:00',
    updatedAt: '2026-07-19T10:15:00+07:00',
    areaLabel: 'Tlogowungu',
    csPicName: 'CS Operator 01',
    terminationReason: 'Data perangkat belum sinkron antara billing dan catatan lapangan.',
    nextActionLabel: 'Tunggu koreksi billing/CS',
    supportHistoryId: null,
    supportClosedAt: null,
    inventoryItemCodes: [],
    auditSummary: ['Masuk review CS', 'Dikembalikan untuk koreksi data'],
  },
  {
    id: 204,
    dismantleListCode: 'DML-202607-0004',
    sourceIsolationRef: 'ISO-202606-0061',
    customerName: 'PT Sumber Makmur',
    customerPhone: '62295770011',
    serviceRef: 'SUB-KIM-00091',
    addressText: 'Kawasan Industri Pati Blok D-5',
    odpCode: 'ODP-KIM-02',
    isolationStartedAt: '2026-06-05T08:30:00+07:00',
    eligibleAt: '2026-07-05T08:30:00+07:00',
    status: 'DITRANSFER_KE_TICKETING',
    reviewNotes: 'Terminasi disetujui dan perangkat harus diambil oleh tim dismantle.',
    correctionNotes: null,
    transferredTicketRef: 'WO-202607-0301',
    transferredWorkOrderId: null,
    createdAt: '2026-07-17T09:10:00+07:00',
    updatedAt: '2026-07-19T11:20:00+07:00',
    areaLabel: 'Pati Industri',
    csPicName: 'CS Admin',
    terminationReason: 'Kontrak berakhir, layanan resmi terminasi.',
    nextActionLabel: 'Monitor ticket dismantle',
    supportHistoryId: 301,
    supportClosedAt: '2026-07-19T14:25:00+07:00',
    inventoryItemCodes: ['INV-ONT-ZTE-F670L-000301', 'INV-ADP-ZTE-12V-000301'],
    auditSummary: ['Masuk dari isolir', 'Ditransfer ke ticketing'],
  },
  {
    id: 205,
    dismantleListCode: 'DML-202607-0005',
    sourceIsolationRef: 'ISO-202606-0068',
    customerName: 'Mulyono',
    customerPhone: '628222110011',
    serviceRef: 'SUB-PTR-00412',
    addressText: 'Jl. Raya Pati Timur Km 2',
    odpCode: 'ODP-PTR-05',
    isolationStartedAt: '2026-06-08T07:45:00+07:00',
    eligibleAt: '2026-07-08T07:45:00+07:00',
    status: 'BATAL',
    reviewNotes: 'Customer akhirnya melunasi dan layanan dipulihkan, tidak perlu dismantle.',
    correctionNotes: null,
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    createdAt: '2026-07-17T14:30:00+07:00',
    updatedAt: '2026-07-19T08:55:00+07:00',
    areaLabel: 'Pati Timur',
    csPicName: 'CS Admin',
    terminationReason: 'Terminasi dibatalkan setelah pelunasan.',
    nextActionLabel: 'Bisa dibuka ulang jika perlu',
    supportHistoryId: null,
    supportClosedAt: null,
    inventoryItemCodes: [],
    auditSummary: ['Masuk review CS', 'Dibatalkan karena layanan aktif kembali'],
  },
]

const seededDismantleListIds = new Set(mockDismantleListItems.map((item) => item.id))

const transitionMap: Record<DismantleListTransitionAction, { from: DismantleListStatus[]; to: DismantleListStatus }> = {
  SUBMIT_REVIEW: {
    from: ['BARU', 'PERLU_KOREKSI'],
    to: 'REVIEW_CS',
  },
  REQUEST_CORRECTION: {
    from: ['REVIEW_CS'],
    to: 'PERLU_KOREKSI',
  },
  TRANSFER: {
    from: ['REVIEW_CS'],
    to: 'DITRANSFER_KE_TICKETING',
  },
  CANCEL: {
    from: ['REVIEW_CS'],
    to: 'BATAL',
  },
  REOPEN: {
    from: ['BATAL'],
    to: 'REVIEW_CS',
  },
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveInt(value: string | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeStatus(value: string | null | undefined): DismantleListStatus {
  const normalized = normalizeText(value)
  if (
    normalized === 'BARU' ||
    normalized === 'REVIEW_CS' ||
    normalized === 'PERLU_KOREKSI' ||
    normalized === 'DITRANSFER_KE_TICKETING' ||
    normalized === 'BATAL'
  ) {
    return normalized
  }

  return 'BARU'
}

function buildNextActionLabel(status: DismantleListStatus) {
  switch (status) {
    case 'BARU':
      return 'Masuk review CS'
    case 'REVIEW_CS':
      return 'Putuskan review'
    case 'PERLU_KOREKSI':
      return 'Tunggu koreksi billing/CS'
    case 'DITRANSFER_KE_TICKETING':
      return 'Monitor ticket dismantle'
    case 'BATAL':
      return 'Bisa dibuka ulang jika perlu'
    default:
      return 'Pantau antrean'
  }
}

function formatDismantleListCode(isolationId: number, eligibleAt: string | null, transferredAt: string | null) {
  const seedDate = eligibleAt || transferredAt
  const resolvedDate = seedDate ? new Date(seedDate) : new Date()
  const yearMonth =
    Number.isFinite(resolvedDate.getTime())
      ? `${resolvedDate.getFullYear()}${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`
      : '000000'

  return `DML-${yearMonth}-${String(isolationId).padStart(4, '0')}`
}

function parseIsolationIdFromRef(value: string | null) {
  const matched = String(value ?? '').trim().match(/(\d+)\s*$/)
  if (!matched) {
    return null
  }

  const parsed = Number.parseInt(matched[1], 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseReturnedItemCodes(value: string | null | undefined) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\r\n,;]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

async function getSupportHistoryStateMap(isolationIds: number[]) {
  const uniqueIsolationIds = Array.from(new Set(isolationIds.filter((value) => Number.isFinite(value) && value > 0)))
  if (!uniqueIsolationIds.length) {
    return new Map<number, ReviewDbHistoryStateRow>()
  }

  const [hasHistoryId, hasIsolationId, hasClosedAt, hasCloseNote, hasReturnedItemCodes] = await Promise.all([
    hasReviewDbColumn('support_dismantle_history', 'id'),
    hasReviewDbColumn('support_dismantle_history', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
    hasReviewDbColumn('support_dismantle_history', 'close_note'),
    hasReviewDbColumn('support_dismantle_history', 'returned_item_codes'),
  ])
  if (!hasHistoryId || !hasIsolationId) {
    return new Map<number, ReviewDbHistoryStateRow>()
  }

  const placeholders = uniqueIsolationIds.map(() => '?').join(', ')
  const rows = await runReviewDbQuery<ReviewDbHistoryStateRow>(
    `
      SELECT
        id AS historyId,
        isolation_id AS isolationId,
        ${hasClosedAt ? 'closed_at' : 'NULL'} AS closedAt,
        ${hasCloseNote ? 'close_note' : 'NULL'} AS closeNote,
        ${hasReturnedItemCodes ? 'returned_item_codes' : 'NULL'} AS returnedItemCodes
      FROM support_dismantle_history
      WHERE isolation_id IN (${placeholders})
      ORDER BY id DESC
    `,
    uniqueIsolationIds,
  )

  const map = new Map<number, ReviewDbHistoryStateRow>()
  for (const row of rows) {
    if (!map.has(row.isolationId)) {
      map.set(row.isolationId, row)
    }
  }

  return map
}

async function getWorkOrderInventoryItemCodesMap(workOrderIds: number[]) {
  const uniqueWorkOrderIds = Array.from(new Set(workOrderIds.filter((value) => Number.isFinite(value) && value > 0)))
  if (!uniqueWorkOrderIds.length) {
    return new Map<number, string[]>()
  }

  const [hasMovementWorkOrderId, hasMovementItemId, hasInventoryItemId, hasInventoryItemCode] = await Promise.all([
    hasReviewDbColumn('inventory_stock_movements', 'work_order_id'),
    hasReviewDbColumn('inventory_stock_movements', 'item_id'),
    hasReviewDbColumn('inventory_items', 'id'),
    hasReviewDbColumn('inventory_items', 'item_code'),
  ])
  if (!hasMovementWorkOrderId || !hasMovementItemId || !hasInventoryItemId || !hasInventoryItemCode) {
    return new Map<number, string[]>()
  }

  const placeholders = uniqueWorkOrderIds.map(() => '?').join(', ')
  const rows = await runReviewDbQuery<ReviewDbWorkOrderInventoryRow>(
    `
      SELECT
        m.work_order_id AS workOrderId,
        i.item_code AS itemCode
      FROM inventory_stock_movements m
      INNER JOIN inventory_items i
        ON i.id = m.item_id
      WHERE m.work_order_id IN (${placeholders})
      ORDER BY m.id DESC
    `,
    uniqueWorkOrderIds,
  )

  const map = new Map<number, string[]>()
  for (const row of rows) {
    const itemCode = String(row.itemCode ?? '').trim().toUpperCase()
    if (!itemCode) {
      continue
    }

    const current = map.get(row.workOrderId) ?? []
    if (!current.includes(itemCode)) {
      current.push(itemCode)
      map.set(row.workOrderId, current)
    }
  }

  return map
}

async function enrichDismantleListItems(items: DismantleListItem[]) {
  const historyStateMapPromise = getSupportHistoryStateMap(
    items
      .map((item) => parseIsolationIdFromRef(item.sourceIsolationRef))
      .filter((value): value is number => value != null),
  )
  const inventoryItemCodesMapPromise = getWorkOrderInventoryItemCodesMap(
    items
      .map((item) => item.transferredWorkOrderId)
      .filter((value): value is number => value != null),
  )

  const [historyStateMap, inventoryItemCodesMap] = await Promise.all([
    historyStateMapPromise,
    inventoryItemCodesMapPromise,
  ])

  return items.map((item) => {
    const isolationId = parseIsolationIdFromRef(item.sourceIsolationRef)
    const historyState = isolationId ? historyStateMap.get(isolationId) ?? null : null
    const historyItemCodes = parseReturnedItemCodes(historyState?.returnedItemCodes)
    const fallbackItemCodesFromNote = historyItemCodes.length
      ? []
      : parseReturnedItemCodes(
          parseStructuredSupportNote(historyState?.closeNote).metadata.get(
            SUPPORT_DISMANTLE_METADATA_PREFIXES.returnedItemCodes,
          ) ?? '',
        )
    const inventoryItemCodes =
      historyItemCodes.length || fallbackItemCodesFromNote.length
        ? [...historyItemCodes, ...fallbackItemCodesFromNote].filter(
            (value, index, collection) => collection.indexOf(value) === index,
          )
        : item.transferredWorkOrderId != null
          ? inventoryItemCodesMap.get(item.transferredWorkOrderId) ?? []
          : []

    return {
      ...item,
      supportHistoryId: historyState?.historyId ?? null,
      supportClosedAt: historyState?.closedAt ?? null,
      inventoryItemCodes,
    }
  })
}

async function getActiveQueueSourceRows() {
  const [
    hasQueueId,
    hasQueueIsolationId,
    hasTransferNote,
    hasTransferredAt,
    hasIsolationCustomerName,
    hasIsolationCustomerPhone,
    hasIsolationAddress,
    hasIsolationReason,
    hasIsolationDate,
    hasIsolationRadboxName,
    hasIsolationSubscriptionId,
  ] = await Promise.all([
    hasReviewDbColumn('support_dismantle_queue', 'id'),
    hasReviewDbColumn('support_dismantle_queue', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
    hasReviewDbColumn('support_dismantle_queue', 'transferred_at'),
    hasReviewDbColumn('support_isolations', 'customer_name'),
    hasReviewDbColumn('support_isolations', 'customer_phone'),
    hasReviewDbColumn('support_isolations', 'customer_address'),
    hasReviewDbColumn('support_isolations', 'reason'),
    hasReviewDbColumn('support_isolations', 'isolation_date'),
    hasReviewDbColumn('support_isolations', 'radbox_name'),
    hasReviewDbColumn('support_isolations', 'subscription_id'),
  ])

  if (!hasQueueId || !hasQueueIsolationId || !hasIsolationCustomerName) {
    return [] as ReviewDbQueueSourceRow[]
  }

  return runReviewDbQuery<ReviewDbQueueSourceRow>(
    `
      SELECT
        dq.id AS queueId,
        dq.isolation_id AS isolationId,
        si.customer_name AS customerName,
        ${hasIsolationCustomerPhone ? 'si.customer_phone' : 'NULL'} AS customerPhone,
        ${hasIsolationSubscriptionId ? 'CAST(si.subscription_id AS CHAR)' : 'NULL'} AS serviceRef,
        ${hasIsolationAddress ? 'si.customer_address' : 'NULL'} AS addressText,
        NULL AS odpCode,
        ${hasIsolationDate ? 'si.isolation_date' : 'NULL'} AS isolationStartedAt,
        ${hasTransferredAt ? 'dq.transferred_at' : hasIsolationDate ? 'si.isolation_date' : 'NULL'} AS eligibleAt,
        ${hasTransferNote ? 'dq.transfer_note' : 'NULL'} AS transferNote,
        ${hasIsolationRadboxName ? 'si.radbox_name' : 'NULL'} AS areaLabel,
        ${hasIsolationReason ? 'si.reason' : 'NULL'} AS terminationReason,
        ${hasTransferredAt ? 'dq.transferred_at' : 'NULL'} AS transferredAt
      FROM support_dismantle_queue dq
      INNER JOIN support_isolations si
        ON si.id = dq.isolation_id
      ORDER BY ${hasTransferredAt ? 'dq.transferred_at' : 'dq.id'} DESC, dq.id DESC
    `,
  )
}

async function syncDismantleListsFromActiveQueue() {
  await ensureDismantleListTables()

  const sourceRows = await getActiveQueueSourceRows()
  if (!sourceRows.length) {
    return 0
  }

  let insertedCount = 0
  await runReviewDbTransaction(async (connection) => {
    for (const row of sourceRows) {
      const sourceIsolationRef = `ISO-${String(row.isolationId).padStart(6, '0')}`
      const [existingRows] = await connection.query(
        `
          SELECT
            id,
            status,
            transferred_ticket_ref AS transferredTicketRef,
            transferred_work_order_id AS transferredWorkOrderId
          FROM support_dismantle_lists
          WHERE source_isolation_ref = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [sourceIsolationRef],
      )
      const existing = (existingRows as ReviewDbExistingListRow[])[0] ?? null

      const nextStatus =
        existing?.status && normalizeStatus(existing.status) === 'DITRANSFER_KE_TICKETING'
          ? 'DITRANSFER_KE_TICKETING'
          : existing?.status && normalizeStatus(existing.status) === 'REVIEW_CS'
            ? 'REVIEW_CS'
            : existing?.status && normalizeStatus(existing.status) === 'PERLU_KOREKSI'
              ? 'PERLU_KOREKSI'
              : 'BARU'

      const nextActionLabel =
        nextStatus === 'BARU' && row.transferNote?.trim()
          ? 'Masuk review CS dari isolir'
          : buildNextActionLabel(nextStatus)

      const reviewNotes =
        nextStatus === 'BARU' && row.transferNote?.trim() ? row.transferNote.trim() : existing?.status ? null : row.transferNote?.trim() || null

      if (existing) {
        await connection.query(
          `
            UPDATE support_dismantle_lists
            SET
              customer_name = ?,
              customer_phone = ?,
              service_ref = ?,
              address_text = ?,
              odp_code = ?,
              isolation_started_at = ?,
              eligible_at = ?,
              review_notes = COALESCE(review_notes, ?),
              area_label = ?,
              termination_reason = COALESCE(termination_reason, ?),
              next_action_label = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [
            row.customerName ?? 'Customer belum diisi',
            row.customerPhone,
            row.serviceRef,
            row.addressText ?? '-',
            row.odpCode,
            row.isolationStartedAt,
            row.eligibleAt,
            reviewNotes,
            row.areaLabel,
            row.terminationReason ?? row.transferNote ?? null,
            nextActionLabel,
            existing.id,
          ],
        )
        continue
      }

      const dismantleListCode = formatDismantleListCode(row.isolationId, row.eligibleAt, row.transferredAt)
      const [insertResult] = await connection.query(
        `
          INSERT INTO support_dismantle_lists (
            dismantle_list_code,
            source_isolation_ref,
            customer_name,
            customer_phone,
            service_ref,
            address_text,
            odp_code,
            isolation_started_at,
            eligible_at,
            status,
            review_notes,
            area_label,
            termination_reason,
            next_action_label
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          dismantleListCode,
          sourceIsolationRef,
          row.customerName ?? 'Customer belum diisi',
          row.customerPhone,
          row.serviceRef,
          row.addressText ?? '-',
          row.odpCode,
          row.isolationStartedAt,
          row.eligibleAt,
          nextStatus,
          reviewNotes,
          row.areaLabel,
          row.terminationReason ?? row.transferNote ?? null,
          nextActionLabel,
        ],
      )

      const dismantleListId = Number((insertResult as ExecuteResult).insertId ?? 0)
      if (Number.isInteger(dismantleListId) && dismantleListId > 0) {
        insertedCount += 1
        await connection.query(
          `
            INSERT INTO support_dismantle_list_audits (
              dismantle_list_id,
              event_type,
              from_status,
              to_status,
              actor_name,
              actor_role,
              notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            dismantleListId,
            'SYNC_QUEUE',
            null,
            nextStatus,
            'system',
            'SYSTEM',
            row.transferNote?.trim()
              ? `Sinkron dari queue dismantle aktif. ${row.transferNote.trim()}`
              : 'Sinkron dari queue dismantle aktif.',
          ],
        )
      }
    }
  })

  return insertedCount
}

function buildFallbackSnapshot(detail: string) {
  return getFallbackDataSourceSnapshot(detail)
}

function mapReviewDbRowToDismantleListItem(row: ReviewDbDismantleListRow): DismantleListItem {
  const status = normalizeStatus(row.status)

  return {
    id: Number(row.id),
    dismantleListCode: String(row.dismantleListCode ?? '-'),
    sourceIsolationRef: row.sourceIsolationRef,
    customerName: String(row.customerName ?? 'Customer belum diisi'),
    customerPhone: row.customerPhone,
    serviceRef: row.serviceRef,
    addressText: String(row.addressText ?? '-'),
    odpCode: row.odpCode,
    isolationStartedAt: row.isolationStartedAt,
    eligibleAt: row.eligibleAt,
    status,
    reviewNotes: row.reviewNotes,
    correctionNotes: row.correctionNotes,
    transferredTicketRef: row.transferredTicketRef,
    transferredWorkOrderId: row.transferredWorkOrderId != null ? Number(row.transferredWorkOrderId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    areaLabel: row.areaLabel,
    csPicName: row.csPicName,
    terminationReason: row.terminationReason,
    nextActionLabel: row.nextActionLabel?.trim() || buildNextActionLabel(status),
    supportHistoryId: null,
    supportClosedAt: null,
    inventoryItemCodes: [],
    auditSummary: [],
  }
}

async function ensureDismantleListColumn(columnName: string, definitionSql: string, afterColumn: string) {
  if (await hasReviewDbColumn('support_dismantle_lists', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE support_dismantle_lists
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('support_dismantle_lists', columnName)
}

async function ensureDismantleListAuditColumn(columnName: string, definitionSql: string, afterColumn: string) {
  if (await hasReviewDbColumn('support_dismantle_list_audits', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE support_dismantle_list_audits
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('support_dismantle_list_audits', columnName)
}

export async function ensureDismantleListTables() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS support_dismantle_lists (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        dismantle_list_code VARCHAR(40) NOT NULL,
        source_isolation_ref VARCHAR(80) NULL,
        customer_name VARCHAR(180) NOT NULL,
        customer_phone VARCHAR(40) NULL,
        service_ref VARCHAR(80) NULL,
        address_text TEXT NOT NULL,
        odp_code VARCHAR(60) NULL,
        isolation_started_at DATETIME NULL,
        eligible_at DATETIME NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'BARU',
        review_notes TEXT NULL,
        correction_notes TEXT NULL,
        transferred_ticket_ref VARCHAR(80) NULL,
        transferred_work_order_id BIGINT UNSIGNED NULL,
        transferred_by VARCHAR(150) NULL,
        transferred_at DATETIME NULL,
        area_label VARCHAR(120) NULL,
        cs_pic_name VARCHAR(120) NULL,
        termination_reason TEXT NULL,
        next_action_label VARCHAR(150) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_support_dismantle_lists_code (dismantle_list_code),
        KEY idx_support_dismantle_lists_status (status),
        KEY idx_support_dismantle_lists_eligible (eligible_at),
        KEY idx_support_dismantle_lists_customer (customer_name)
      )
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS support_dismantle_list_audits (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        dismantle_list_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        from_status VARCHAR(40) NULL,
        to_status VARCHAR(40) NULL,
        actor_name VARCHAR(150) NOT NULL,
        actor_role VARCHAR(80) NOT NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_support_dismantle_list_audits_item (dismantle_list_id),
        KEY idx_support_dismantle_list_audits_event (event_type),
        CONSTRAINT fk_support_dismantle_list_audits_item FOREIGN KEY (dismantle_list_id) REFERENCES support_dismantle_lists(id)
      )
    `,
  )

  await ensureDismantleListColumn('transferred_work_order_id', 'transferred_work_order_id BIGINT UNSIGNED NULL', 'transferred_ticket_ref')
  await ensureDismantleListColumn('transferred_by', 'transferred_by VARCHAR(150) NULL', 'transferred_work_order_id')
  await ensureDismantleListColumn('transferred_at', 'transferred_at DATETIME NULL', 'transferred_by')
  await ensureDismantleListColumn('area_label', 'area_label VARCHAR(120) NULL', 'transferred_at')
  await ensureDismantleListColumn('cs_pic_name', 'cs_pic_name VARCHAR(120) NULL', 'area_label')
  await ensureDismantleListColumn('termination_reason', 'termination_reason TEXT NULL', 'cs_pic_name')
  await ensureDismantleListColumn('next_action_label', 'next_action_label VARCHAR(150) NULL', 'termination_reason')

  await ensureDismantleListAuditColumn('from_status', 'from_status VARCHAR(40) NULL', 'event_type')
  await ensureDismantleListAuditColumn('to_status', 'to_status VARCHAR(40) NULL', 'from_status')
  await ensureDismantleListAuditColumn('actor_name', "actor_name VARCHAR(150) NOT NULL DEFAULT 'system'", 'to_status')
  await ensureDismantleListAuditColumn('actor_role', "actor_role VARCHAR(80) NOT NULL DEFAULT 'SYSTEM'", 'actor_name')
  await ensureDismantleListAuditColumn('notes', 'notes TEXT NULL', 'actor_role')
  await ensureDismantleListAuditColumn('created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', 'notes')
}

export async function ensureDismantleListBaselineSeeds() {
  await ensureDismantleListTables()

  const rows = await runReviewDbQuery<ReviewDbCountRow>(
    `
      SELECT COUNT(*) AS total
      FROM support_dismantle_lists
    `,
  )
  if (Number(rows[0]?.total ?? 0) > 0) {
    return
  }

  const itemPlaceholders = mockDismantleListItems.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const itemValues: Array<number | string | null> = []
  for (const item of mockDismantleListItems) {
    itemValues.push(
      item.id,
      item.dismantleListCode,
      item.sourceIsolationRef,
      item.customerName,
      item.customerPhone,
      item.serviceRef,
      item.addressText,
      item.odpCode,
      item.isolationStartedAt,
      item.eligibleAt,
      item.status,
      item.reviewNotes,
      item.correctionNotes,
      item.transferredTicketRef,
      item.areaLabel,
      item.csPicName,
      item.terminationReason,
      item.nextActionLabel,
      item.createdAt,
      item.updatedAt,
    )
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO support_dismantle_lists (
        id,
        dismantle_list_code,
        source_isolation_ref,
        customer_name,
        customer_phone,
        service_ref,
        address_text,
        odp_code,
        isolation_started_at,
        eligible_at,
        status,
        review_notes,
        correction_notes,
        transferred_ticket_ref,
        area_label,
        cs_pic_name,
        termination_reason,
        next_action_label,
        created_at,
        updated_at
      )
      VALUES ${itemPlaceholders}
    `,
    itemValues,
  )

  const auditPlaceholders: string[] = []
  const auditValues: Array<number | string | null> = []
  for (const item of mockDismantleListItems) {
    for (const note of item.auditSummary) {
      auditPlaceholders.push('(?, ?, ?, ?, ?, ?, ?)')
      auditValues.push(item.id, 'SEED', null, item.status, 'system', 'SYSTEM', note)
    }
  }

  if (auditPlaceholders.length) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO support_dismantle_list_audits (
          dismantle_list_id,
          event_type,
          from_status,
          to_status,
          actor_name,
          actor_role,
          notes
        )
        VALUES ${auditPlaceholders.join(', ')}
      `,
      auditValues,
    )
  }
}

async function getDismantleListAuditSummary(dismantleListId: number) {
  const rows = await runReviewDbQuery<ReviewDbAuditRow>(
    `
      SELECT
        event_type AS eventType,
        to_status AS toStatus,
        notes
      FROM support_dismantle_list_audits
      WHERE dismantle_list_id = ?
      ORDER BY id DESC
      LIMIT 3
    `,
    [dismantleListId],
  )

  if (!rows.length) {
    return ['Belum ada audit tambahan di review DB.']
  }

  return rows.map((row) => {
    const eventType = String(row.eventType ?? 'UPDATE').trim().toUpperCase()
    const toStatus = String(row.toStatus ?? '').trim().toUpperCase()
    const notes = String(row.notes ?? '').trim()
    return notes || `${eventType}${toStatus ? ` -> ${toStatus}` : ''}`
  })
}

async function getReviewDbDismantleListPageData(query: DismantleListQuery, source: DataSourceSnapshot): Promise<DismantleListPagePayload> {
  await syncDismantleListsFromActiveQueue()
  await ensureDismantleListBaselineSeeds()

  const state = {
    status: resolveSearchParam(query.status)?.trim().toUpperCase() || null,
    owner: resolveSearchParam(query.owner)?.trim() || null,
    q: resolveSearchParam(query.q)?.trim() || null,
    selected: resolveSearchParam(query.selected)?.trim() || null,
  }

  const where: string[] = []
  const values: unknown[] = []
  if (state.status) {
    where.push('status = ?')
    values.push(state.status)
  }
  if (state.owner) {
    where.push('cs_pic_name = ?')
    values.push(state.owner)
  }
  if (state.q) {
    const like = `%${state.q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    where.push(`(
      dismantle_list_code LIKE ?
      OR source_isolation_ref LIKE ?
      OR customer_name LIKE ?
      OR customer_phone LIKE ?
      OR service_ref LIKE ?
      OR address_text LIKE ?
      OR odp_code LIKE ?
      OR transferred_ticket_ref LIKE ?
      OR area_label LIKE ?
      OR termination_reason LIKE ?
    )`)
    values.push(like, like, like, like, like, like, like, like, like, like)
  }

  const rows = await runReviewDbQuery<ReviewDbDismantleListRow>(
    `
      SELECT
        id,
        dismantle_list_code AS dismantleListCode,
        source_isolation_ref AS sourceIsolationRef,
        customer_name AS customerName,
        customer_phone AS customerPhone,
        service_ref AS serviceRef,
        address_text AS addressText,
        odp_code AS odpCode,
        isolation_started_at AS isolationStartedAt,
        eligible_at AS eligibleAt,
        status,
        review_notes AS reviewNotes,
        correction_notes AS correctionNotes,
        transferred_ticket_ref AS transferredTicketRef,
        transferred_work_order_id AS transferredWorkOrderId,
        created_at AS createdAt,
        updated_at AS updatedAt,
        area_label AS areaLabel,
        cs_pic_name AS csPicName,
        termination_reason AS terminationReason,
        next_action_label AS nextActionLabel
      FROM support_dismantle_lists
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY eligible_at IS NULL, eligible_at ASC, id DESC
    `,
    values,
  )

  const visibleRows = rows.some((row) => !seededDismantleListIds.has(Number(row.id)))
    ? rows.filter((row) => !seededDismantleListIds.has(Number(row.id)))
    : rows
  const items = await enrichDismantleListItems(visibleRows.map((row) => mapReviewDbRowToDismantleListItem(row)))
  const selectedId = resolvePositiveInt(state.selected)
  const selectedBase = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const selectedItem = selectedBase
    ? {
        ...selectedBase,
        auditSummary: [
          ...(await getDismantleListAuditSummary(selectedBase.id)),
          ...(selectedBase.supportHistoryId
            ? [
                `Sudah close ke histori support${selectedBase.supportClosedAt ? ` pada ${selectedBase.supportClosedAt}` : ''}`,
              ]
            : []),
          ...(selectedBase.supportHistoryId && selectedBase.inventoryItemCodes.length
            ? [`Histori inventory siap dibuka untuk ${selectedBase.inventoryItemCodes.length} item`]
            : []),
        ],
      }
    : null

  return {
    source,
    items,
    selectedItem,
    summary: {
      totalCount: items.length,
      baruCount: items.filter((item) => item.status === 'BARU').length,
      reviewCount: items.filter((item) => item.status === 'REVIEW_CS').length,
      correctionCount: items.filter((item) => item.status === 'PERLU_KOREKSI').length,
      transferredCount: items.filter((item) => item.status === 'DITRANSFER_KE_TICKETING').length,
      canceledCount: items.filter((item) => item.status === 'BATAL').length,
    },
    ownerOptions: Array.from(
      new Set(
        visibleRows
          .map((row) => String(row.csPicName ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
    state,
  }
}

async function getDismantleListPageDataWithMock(
  query: DismantleListQuery,
  source: DataSourceSnapshot,
): Promise<DismantleListPagePayload> {
  const state = {
    status: resolveSearchParam(query.status)?.trim().toUpperCase() || null,
    owner: resolveSearchParam(query.owner)?.trim() || null,
    q: resolveSearchParam(query.q)?.trim() || null,
    selected: resolveSearchParam(query.selected)?.trim() || null,
  }

  const searchNeedle = normalizeText(state.q)
  const filteredItems = mockDismantleListItems
    .filter((item) => !state.status || item.status === state.status)
    .filter((item) => !state.owner || item.csPicName === state.owner)
    .filter((item) => {
      if (!searchNeedle) {
        return true
      }

      return [
        item.dismantleListCode,
        item.sourceIsolationRef,
        item.customerName,
        item.customerPhone,
        item.serviceRef,
        item.addressText,
        item.odpCode,
        item.transferredTicketRef,
        item.areaLabel,
        item.terminationReason,
      ].some((value) => normalizeText(value).includes(searchNeedle))
    })

  const selectedId = resolvePositiveInt(state.selected)
  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null

  return {
    source,
    items: filteredItems,
    selectedItem,
    summary: {
      totalCount: filteredItems.length,
      baruCount: filteredItems.filter((item) => item.status === 'BARU').length,
      reviewCount: filteredItems.filter((item) => item.status === 'REVIEW_CS').length,
      correctionCount: filteredItems.filter((item) => item.status === 'PERLU_KOREKSI').length,
      transferredCount: filteredItems.filter((item) => item.status === 'DITRANSFER_KE_TICKETING').length,
      canceledCount: filteredItems.filter((item) => item.status === 'BATAL').length,
    },
    ownerOptions: Array.from(new Set(mockDismantleListItems.map((item) => item.csPicName).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    ),
    state,
  }
}

export function canUpdateDismantleList(role: AppRole) {
  return ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'FINANCE', 'CS_OPERATOR', 'CS_ADMIN'].includes(role)
}

export function canApproveDismantleList(role: AppRole) {
  return ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'FINANCE', 'CS_ADMIN'].includes(role)
}

function buildTransitionEventType(action: DismantleListTransitionAction) {
  switch (action) {
    case 'SUBMIT_REVIEW':
      return 'SUBMIT_REVIEW'
    case 'REQUEST_CORRECTION':
      return 'REQUEST_CORRECTION'
    case 'TRANSFER':
      return 'TRANSFER'
    case 'CANCEL':
      return 'CANCEL'
    case 'REOPEN':
      return 'REOPEN'
    default:
      return 'UPDATE'
  }
}

export async function transitionDismantleListStatus(params: {
  dismantleListId: number
  action: DismantleListTransitionAction
  notes: string
  actorName: string
  actorRole: string
}) {
  await ensureDismantleListBaselineSeeds()

  const rule = transitionMap[params.action]
  const [row] = await runReviewDbQuery<ReviewDbDismantleListRow>(
    `
      SELECT
        id,
        dismantle_list_code AS dismantleListCode,
        customer_name AS customerName,
        status,
        review_notes AS reviewNotes,
        correction_notes AS correctionNotes
      FROM support_dismantle_lists
      WHERE id = ?
      LIMIT 1
    `,
    [params.dismantleListId],
  )

  if (!row) {
    throw new Error('Item List Dismantle tidak ditemukan.')
  }

  const currentStatus = normalizeStatus(row.status)
  if (!rule.from.includes(currentStatus)) {
    throw new Error(`Transisi ${params.action} tidak valid dari status ${currentStatus}.`)
  }

  const notes = params.notes.trim()
  if ((params.action === 'REQUEST_CORRECTION' || params.action === 'CANCEL') && !notes) {
    throw new Error('Catatan wajib diisi untuk aksi koreksi atau pembatalan.')
  }

  const nextStatus = rule.to
  const nextActionLabel = buildNextActionLabel(nextStatus)
  const reviewNotes =
    params.action === 'REQUEST_CORRECTION' || params.action === 'CANCEL'
      ? notes || row.reviewNotes
      : params.action === 'SUBMIT_REVIEW'
        ? notes || row.reviewNotes
        : row.reviewNotes
  const correctionNotes =
    params.action === 'REQUEST_CORRECTION'
      ? notes
      : params.action === 'SUBMIT_REVIEW' || params.action === 'REOPEN'
        ? null
        : row.correctionNotes

  await runReviewDbTransaction(async (connection) => {
    await connection.query(
      `
        UPDATE support_dismantle_lists
        SET
          status = ?,
          review_notes = ?,
          correction_notes = ?,
          cs_pic_name = CASE
            WHEN ? IN ('CS_OPERATOR', 'CS_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'FINANCE', 'OWNER') THEN ?
            ELSE cs_pic_name
          END,
          next_action_label = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        nextStatus,
        reviewNotes,
        correctionNotes,
        params.actorRole,
        params.actorName,
        nextActionLabel,
        row.id,
      ],
    )

    await connection.query(
      `
        INSERT INTO support_dismantle_list_audits (
          dismantle_list_id,
          event_type,
          from_status,
          to_status,
          actor_name,
          actor_role,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        buildTransitionEventType(params.action),
        currentStatus,
        nextStatus,
        params.actorName,
        params.actorRole,
        notes || `${buildTransitionEventType(params.action)} via web`,
      ],
    )
  })

  return {
    id: row.id,
    dismantleListCode: String(row.dismantleListCode ?? '-'),
    customerName: String(row.customerName ?? 'Customer belum diisi'),
    previousStatus: currentStatus,
    nextStatus,
  }
}

export async function transferDismantleListToTicket(params: {
  dismantleListId: number
  notes: string
  actorName: string
  actorRole: string
  actorUsername: string
  branchId: number | null
}) {
  await ensureDismantleListBaselineSeeds()
  await ensureServiceWorkOrderStatusLogTable()

  const [row] = await runReviewDbQuery<ReviewDbDismantleListRow>(
    `
      SELECT
        id,
        dismantle_list_code AS dismantleListCode,
        source_isolation_ref AS sourceIsolationRef,
        customer_name AS customerName,
        customer_phone AS customerPhone,
        service_ref AS serviceRef,
        address_text AS addressText,
        odp_code AS odpCode,
        isolation_started_at AS isolationStartedAt,
        eligible_at AS eligibleAt,
        status,
        review_notes AS reviewNotes,
        correction_notes AS correctionNotes,
        transferred_ticket_ref AS transferredTicketRef,
        transferred_work_order_id AS transferredWorkOrderId,
        created_at AS createdAt,
        updated_at AS updatedAt,
        area_label AS areaLabel,
        cs_pic_name AS csPicName,
        termination_reason AS terminationReason,
        next_action_label AS nextActionLabel
      FROM support_dismantle_lists
      WHERE id = ?
      LIMIT 1
    `,
    [params.dismantleListId],
  )

  if (!row) {
    throw new Error('Item List Dismantle tidak ditemukan.')
  }

  const currentStatus = normalizeStatus(row.status)
  if (currentStatus === 'DITRANSFER_KE_TICKETING') {
    throw new Error('Item List Dismantle ini sudah pernah ditransfer ke ticketing.')
  }
  if (currentStatus !== 'REVIEW_CS') {
    throw new Error(`Hanya item dengan status REVIEW_CS yang bisa ditransfer. Status saat ini: ${currentStatus}.`)
  }

  const actorUserId = await resolveReviewAuthUserIdByUsername(params.actorUsername)
  const workOrderNo = await generateServiceWorkOrderNo()
  const eligibleDate = row.eligibleAt ? new Date(row.eligibleAt) : null
  const scheduledAt = eligibleDate && Number.isFinite(eligibleDate.getTime()) ? eligibleDate : null
  const transferNotes = [
    `[Transfer Dismantle] ${params.actorName}`,
    `Sumber ${row.dismantleListCode ?? '-'}`,
    row.sourceIsolationRef?.trim() ? `Isolir: ${row.sourceIsolationRef.trim()}` : null,
    row.reviewNotes?.trim() ? `Review: ${row.reviewNotes.trim()}` : null,
    row.terminationReason?.trim() ? `Alasan: ${row.terminationReason.trim()}` : null,
    params.notes.trim() ? `Catatan: ${params.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' - ')

  const insertPayload = await buildServiceWorkOrderInsertPayload({
    workOrderNo,
    workType: 'DISMANTLE',
    status: 'OPEN',
    technicianName: null,
    scheduledAt,
    notes: transferNotes,
    branchId: params.branchId ?? null,
    jobCategory: 'DISMANTLE',
    priority: 'MEDIUM',
    sourceType: 'MANUAL',
    currentPicUserId: actorUserId,
    scheduledByUserId: actorUserId,
    address: row.addressText ?? null,
  })

  let workOrderId = 0
  await runReviewDbTransaction(async (connection) => {
    const [insertResult] = await connection.query(
      `
        INSERT INTO service_work_orders (
          ${insertPayload.columns.join(',\n          ')}
        )
        VALUES (${insertPayload.placeholders.join(', ')})
      `,
      insertPayload.values,
    )

    workOrderId = Number((insertResult as ExecuteResult).insertId ?? 0)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new Error('Work order Dismantle berhasil dibuat tetapi ID insert tidak terbaca.')
    }

    await connection.query(
      `
        INSERT INTO service_work_order_status_logs (
          work_order_id,
          from_status,
          to_status,
          reason_code,
          reason_notes,
          changed_by_user_id,
          changed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        workOrderId,
        null,
        'OPEN',
        'AUTO_CREATED',
        `WO Dismantle dibuat dari List Dismantle ${row.dismantleListCode ?? '-'}.`,
        actorUserId,
      ],
    )

    await connection.query(
      `
        UPDATE support_dismantle_lists
        SET
          status = 'DITRANSFER_KE_TICKETING',
          transferred_ticket_ref = ?,
          transferred_work_order_id = ?,
          transferred_by = ?,
          transferred_at = CURRENT_TIMESTAMP,
          next_action_label = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [workOrderNo, workOrderId, params.actorName, buildNextActionLabel('DITRANSFER_KE_TICKETING'), row.id],
    )

    await connection.query(
      `
        INSERT INTO support_dismantle_list_audits (
          dismantle_list_id,
          event_type,
          from_status,
          to_status,
          actor_name,
          actor_role,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        'TRANSFER',
        currentStatus,
        'DITRANSFER_KE_TICKETING',
        params.actorName,
        params.actorRole,
        params.notes.trim() || `Transfer ke ticketing operasional dengan WO ${workOrderNo}.`,
      ],
    )
  })

  return {
    id: row.id,
    dismantleListCode: String(row.dismantleListCode ?? '-'),
    customerName: String(row.customerName ?? 'Customer belum diisi'),
    workOrderNo,
    workOrderId,
  }
}

export async function getDismantleListPageData(query: DismantleListQuery): Promise<DismantleListPagePayload> {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode === 'review-db' && !source.isFallback) {
    try {
      return await getReviewDbDismantleListPageData(query, source)
    } catch (error) {
      return getDismantleListPageDataWithMock(query, buildFallbackSnapshot(getReviewDbErrorDetail(error)))
    }
  }

  if (getConfiguredDataMode() === 'mock') {
    return getDismantleListPageDataWithMock(query, source)
  }

  return getDismantleListPageDataWithMock(
    query,
    buildFallbackSnapshot(
      'List Dismantle sementara memakai mock operasional karena sumber review DB khusus untuk domain ini belum dibuka.',
    ),
  )
}
