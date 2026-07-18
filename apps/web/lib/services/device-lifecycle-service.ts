import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getReviewDbErrorDetail,
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
} from '@/lib/review-db'
import type { DataSourceSnapshot } from '@/lib/types'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type ReviewDbCountRow = {
  total: number
}

type InventorySuggestionRow = {
  itemCode: string | null
  itemName: string | null
}

export type DeviceLifecycleStatus =
  | 'INVENTORY'
  | 'NOC'
  | 'TEAM_PSB'
  | 'TEAM_TROUBLESHOOTS'
  | 'TEAM_JALUR'
  | 'TEAM_DISMANTLE'
  | 'REPLACE'
  | 'REPLACE_OLD'
  | 'REPLACE_NEW'
  | 'PENDING_NOC_VALIDATION'
  | 'INSTALLED'
  | 'DAMAGED'
  | 'RETURNED'

export type DeviceLifecycleTicketType = 'PSB' | 'TROUBLESHOOTS' | 'JALUR' | 'DISMANTLE' | 'UNKNOWN'

export type DeviceLifecycleValidationStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export type DeviceLifecycleLogRow = {
  id: number
  inventoryItemId: number
  itemCode: string | null
  itemName: string | null
  relatedInventoryItemId: number | null
  relatedItemCode: string | null
  relatedItemName: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  ticketType: DeviceLifecycleTicketType | null
  ticketRef: string | null
  lifecycleStatus: DeviceLifecycleStatus | null
  fromStatus: DeviceLifecycleStatus | null
  eventType: string | null
  scanSource: string | null
  targetTeam: string | null
  locationCode: string | null
  locationName: string | null
  validationStatus: DeviceLifecycleValidationStatus | null
  notes: string | null
  actorUserId: number | null
  actorName: string | null
  actorRole: string | null
  createdAt: string | null
}

const delegationStatuses: DeviceLifecycleStatus[] = [
  'TEAM_PSB',
  'TEAM_TROUBLESHOOTS',
  'TEAM_JALUR',
  'TEAM_DISMANTLE',
]

const initialStatuses: DeviceLifecycleStatus[] = ['INVENTORY', 'NOC', ...delegationStatuses]

const transitionMap: Record<DeviceLifecycleStatus, DeviceLifecycleStatus[]> = {
  INVENTORY: ['NOC', ...delegationStatuses],
  NOC: ['INVENTORY', ...delegationStatuses, 'RETURNED'],
  TEAM_PSB: ['PENDING_NOC_VALIDATION', 'RETURNED', 'NOC', ...delegationStatuses],
  TEAM_TROUBLESHOOTS: ['REPLACE', 'REPLACE_OLD', 'REPLACE_NEW', 'PENDING_NOC_VALIDATION', 'RETURNED', 'NOC', ...delegationStatuses],
  TEAM_JALUR: ['PENDING_NOC_VALIDATION', 'RETURNED', 'NOC', ...delegationStatuses],
  TEAM_DISMANTLE: ['RETURNED', 'NOC', 'PENDING_NOC_VALIDATION', ...delegationStatuses],
  REPLACE: ['REPLACE_NEW', 'PENDING_NOC_VALIDATION', 'RETURNED', 'NOC'],
  REPLACE_OLD: ['REPLACE_NEW', 'PENDING_NOC_VALIDATION', 'RETURNED', 'NOC'],
  REPLACE_NEW: ['PENDING_NOC_VALIDATION', 'RETURNED', 'NOC'],
  PENDING_NOC_VALIDATION: ['INSTALLED', 'DAMAGED', 'RETURNED', 'NOC', ...delegationStatuses],
  INSTALLED: ['DAMAGED', 'RETURNED', 'NOC'],
  DAMAGED: ['RETURNED', 'NOC', 'INVENTORY'],
  RETURNED: ['INVENTORY', 'NOC', ...delegationStatuses],
}

export function isDelegationLifecycleStatus(status: DeviceLifecycleStatus | null | undefined) {
  return delegationStatuses.includes((status ?? '') as DeviceLifecycleStatus)
}

export function normalizeDeviceLifecycleStatus(value: string | null | undefined): DeviceLifecycleStatus | null {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) {
    return null
  }

  switch (normalized) {
    case 'TEAM TEKNISI PSB':
      return 'TEAM_PSB'
    case 'TEAM TEKNISI TROUBLESHOOTS':
    case 'TEAM TROUBLESHOOTS':
      return 'TEAM_TROUBLESHOOTS'
    case 'TEAM TEKNISI JALUR':
    case 'TEAM JALUR':
      return 'TEAM_JALUR'
    case 'TEAM TEKNISI DISMANTLE':
    case 'TEAM DISMANTLE':
      return 'TEAM_DISMANTLE'
    case 'PENDING VALIDASI NOC':
      return 'PENDING_NOC_VALIDATION'
    case 'TERPASANG':
      return 'INSTALLED'
    case 'RUSAK':
      return 'DAMAGED'
    case 'KEMBALI':
      return 'RETURNED'
    case 'REPLACE':
      return 'REPLACE_OLD'
    default:
      if ((Object.keys(transitionMap) as DeviceLifecycleStatus[]).includes(normalized as DeviceLifecycleStatus)) {
        return normalized as DeviceLifecycleStatus
      }
      return null
  }
}

export function getAllowedNextDeviceLifecycleStatuses(currentStatus: DeviceLifecycleStatus | null | undefined) {
  if (!currentStatus) {
    return initialStatuses
  }

  return transitionMap[currentStatus] ?? []
}

export function inferDeviceLifecycleEventType(params: {
  fromStatus?: DeviceLifecycleStatus | null
  toStatus: DeviceLifecycleStatus
}) {
  const { fromStatus = null, toStatus } = params

  if (toStatus === 'INVENTORY') {
    return fromStatus === 'RETURNED' || fromStatus === 'DAMAGED' ? 'INVENTORY_RETURN' : 'INVENTORY_INPUT'
  }
  if (toStatus === 'NOC') {
    return 'NOC_CHECKIN'
  }
  if (isDelegationLifecycleStatus(toStatus)) {
    return 'TECHNICIAN_DELEGATION'
  }
  if (toStatus === 'REPLACE' || toStatus === 'REPLACE_OLD') {
    return 'REPLACE_OLD_CAPTURED'
  }
  if (toStatus === 'REPLACE_NEW') {
    return 'REPLACE_NEW_PREPARED'
  }
  if (toStatus === 'PENDING_NOC_VALIDATION') {
    return 'TECHNICIAN_SCAN'
  }
  if (toStatus === 'INSTALLED' || toStatus === 'DAMAGED' || toStatus === 'RETURNED') {
    return 'NOC_VALIDATION'
  }

  return 'MANUAL_UPDATE'
}

function uniquePositiveIntegers(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is number => Number.isInteger(value) && Number(value) > 0)),
  )
}

function buildInClause(values: number[]) {
  if (!values.length) {
    return null
  }

  return values.map(() => '?').join(', ')
}

async function hasTable(tableName: string) {
  const rows = await runReviewDbQuery<ReviewDbCountRow>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [tableName],
  ).catch(() => [])

  return Number(rows[0]?.total ?? 0) > 0
}

async function ensureInventoryDeviceLifecycleColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('inventory_device_lifecycle_logs', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE inventory_device_lifecycle_logs
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('inventory_device_lifecycle_logs', columnName)
}

export async function ensureInventoryDeviceLifecycleTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS inventory_device_lifecycle_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        inventory_item_id BIGINT UNSIGNED NOT NULL,
        related_inventory_item_id BIGINT UNSIGNED NULL,
        work_order_id BIGINT UNSIGNED NULL,
        trouble_ticket_id BIGINT UNSIGNED NULL,
        ticket_type VARCHAR(30) NULL,
        ticket_ref VARCHAR(80) NULL,
        lifecycle_status VARCHAR(50) NOT NULL,
        from_status VARCHAR(50) NULL,
        event_type VARCHAR(50) NOT NULL,
        scan_source VARCHAR(50) NULL,
        target_team VARCHAR(100) NULL,
        location_code VARCHAR(100) NULL,
        location_name VARCHAR(190) NULL,
        validation_status VARCHAR(30) NULL,
        notes TEXT NULL,
        actor_user_id BIGINT UNSIGNED NULL,
        actor_name VARCHAR(190) NULL,
        actor_role VARCHAR(50) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_inventory_device_lifecycle_item (inventory_item_id),
        KEY idx_inventory_device_lifecycle_related_item (related_inventory_item_id),
        KEY idx_inventory_device_lifecycle_wo (work_order_id),
        KEY idx_inventory_device_lifecycle_tt (trouble_ticket_id),
        KEY idx_inventory_device_lifecycle_status (lifecycle_status),
        KEY idx_inventory_device_lifecycle_created (created_at),
        CONSTRAINT fk_inventory_device_lifecycle_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
        CONSTRAINT fk_inventory_device_lifecycle_related_item FOREIGN KEY (related_inventory_item_id) REFERENCES inventory_items(id),
        CONSTRAINT fk_inventory_device_lifecycle_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id),
        CONSTRAINT fk_inventory_device_lifecycle_tt FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id)
      )
    `,
  )

  await ensureInventoryDeviceLifecycleColumn(
    'related_inventory_item_id',
    'related_inventory_item_id BIGINT UNSIGNED NULL',
    'inventory_item_id',
  )
  await ensureInventoryDeviceLifecycleColumn('ticket_type', 'ticket_type VARCHAR(30) NULL', 'trouble_ticket_id')
  await ensureInventoryDeviceLifecycleColumn('ticket_ref', 'ticket_ref VARCHAR(80) NULL', 'ticket_type')
  await ensureInventoryDeviceLifecycleColumn('from_status', 'from_status VARCHAR(50) NULL', 'lifecycle_status')
  await ensureInventoryDeviceLifecycleColumn('location_code', 'location_code VARCHAR(100) NULL', 'target_team')
  await ensureInventoryDeviceLifecycleColumn('location_name', 'location_name VARCHAR(190) NULL', 'location_code')
  await ensureInventoryDeviceLifecycleColumn('validation_status', 'validation_status VARCHAR(30) NULL', 'location_name')
}

export async function getInventoryDeviceLifecycleItemSuggestions(limit = 200) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as string[]
  }

  const tableExists = await hasTable('inventory_items')
  if (!tableExists) {
    return [] as string[]
  }

  const rows = await runReviewDbQuery<InventorySuggestionRow>(
    `
      SELECT
        item_code AS itemCode,
        item_name AS itemName
      FROM inventory_items
      WHERE item_code IS NOT NULL
        AND TRIM(item_code) <> ''
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `,
    [Math.min(Math.max(limit, 20), 400)],
  ).catch(() => [])

  return rows
    .map((row) => [row.itemCode, row.itemName].filter(Boolean).join(' | '))
    .filter(Boolean)
}

export async function getDeviceLifecycleLogs(params: {
  workOrderId?: number | null
  troubleTicketId?: number | null
  limit?: number
}) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return { source, items: [] as DeviceLifecycleLogRow[], error: null as string | null }
  }

  try {
    await ensureInventoryDeviceLifecycleTable()

    const where: string[] = []
    const values: unknown[] = []
    if (params.workOrderId) {
      where.push('l.work_order_id = ?')
      values.push(params.workOrderId)
    }
    if (params.troubleTicketId) {
      where.push('l.trouble_ticket_id = ?')
      values.push(params.troubleTicketId)
    }

    if (!where.length) {
      return { source, items: [] as DeviceLifecycleLogRow[], error: null as string | null }
    }

    values.push(Math.min(Math.max(params.limit ?? 100, 10), 300))

    const rows = await runReviewDbQuery<DeviceLifecycleLogRow>(
      `
        SELECT
          l.id AS id,
          l.inventory_item_id AS inventoryItemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          l.related_inventory_item_id AS relatedInventoryItemId,
          ri.item_code AS relatedItemCode,
          ri.item_name AS relatedItemName,
          l.work_order_id AS workOrderId,
          l.trouble_ticket_id AS troubleTicketId,
          l.ticket_type AS ticketType,
          l.ticket_ref AS ticketRef,
          l.lifecycle_status AS lifecycleStatus,
          l.from_status AS fromStatus,
          l.event_type AS eventType,
          l.scan_source AS scanSource,
          l.target_team AS targetTeam,
          l.location_code AS locationCode,
          l.location_name AS locationName,
          l.validation_status AS validationStatus,
          l.notes AS notes,
          l.actor_user_id AS actorUserId,
          l.actor_name AS actorName,
          l.actor_role AS actorRole,
          l.created_at AS createdAt
        FROM inventory_device_lifecycle_logs l
        INNER JOIN inventory_items i
          ON i.id = l.inventory_item_id
        LEFT JOIN inventory_items ri
          ON ri.id = l.related_inventory_item_id
        WHERE ${where.join(' OR ')}
        ORDER BY l.id DESC
        LIMIT ?
      `,
      values,
    )

    return { source, items: rows, error: null as string | null }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      items: [] as DeviceLifecycleLogRow[],
      error: getReviewDbErrorDetail(error),
    }
  }
}

export async function getLatestDeviceLifecycleLogForItem(inventoryItemId: number) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return { source, item: null as DeviceLifecycleLogRow | null, error: null as string | null }
  }

  try {
    await ensureInventoryDeviceLifecycleTable()

    const rows = await runReviewDbQuery<DeviceLifecycleLogRow>(
      `
        SELECT
          l.id AS id,
          l.inventory_item_id AS inventoryItemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          l.related_inventory_item_id AS relatedInventoryItemId,
          ri.item_code AS relatedItemCode,
          ri.item_name AS relatedItemName,
          l.work_order_id AS workOrderId,
          l.trouble_ticket_id AS troubleTicketId,
          l.ticket_type AS ticketType,
          l.ticket_ref AS ticketRef,
          l.lifecycle_status AS lifecycleStatus,
          l.from_status AS fromStatus,
          l.event_type AS eventType,
          l.scan_source AS scanSource,
          l.target_team AS targetTeam,
          l.location_code AS locationCode,
          l.location_name AS locationName,
          l.validation_status AS validationStatus,
          l.notes AS notes,
          l.actor_user_id AS actorUserId,
          l.actor_name AS actorName,
          l.actor_role AS actorRole,
          l.created_at AS createdAt
        FROM inventory_device_lifecycle_logs l
        INNER JOIN inventory_items i
          ON i.id = l.inventory_item_id
        LEFT JOIN inventory_items ri
          ON ri.id = l.related_inventory_item_id
        WHERE l.inventory_item_id = ?
        ORDER BY l.id DESC
        LIMIT 1
      `,
      [inventoryItemId],
    )

    return {
      source,
      item: rows[0] ?? null,
      error: null as string | null,
    }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      item: null as DeviceLifecycleLogRow | null,
      error: getReviewDbErrorDetail(error),
    }
  }
}

export async function getLatestDeviceLifecycleMaps(params: {
  workOrderIds?: number[]
  troubleTicketIds?: number[]
}) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      source,
      byWorkOrder: new Map<number, DeviceLifecycleLogRow>(),
      byTroubleTicket: new Map<number, DeviceLifecycleLogRow>(),
      error: null as string | null,
    }
  }

  try {
    await ensureInventoryDeviceLifecycleTable()

    const workOrderIds = uniquePositiveIntegers(params.workOrderIds ?? [])
    const troubleTicketIds = uniquePositiveIntegers(params.troubleTicketIds ?? [])
    const where: string[] = []
    const values: unknown[] = []

    if (workOrderIds.length) {
      const clause = buildInClause(workOrderIds)
      if (clause) {
        where.push(`l.work_order_id IN (${clause})`)
        values.push(...workOrderIds)
      }
    }
    if (troubleTicketIds.length) {
      const clause = buildInClause(troubleTicketIds)
      if (clause) {
        where.push(`l.trouble_ticket_id IN (${clause})`)
        values.push(...troubleTicketIds)
      }
    }

    if (!where.length) {
      return {
        source,
        byWorkOrder: new Map<number, DeviceLifecycleLogRow>(),
        byTroubleTicket: new Map<number, DeviceLifecycleLogRow>(),
        error: null as string | null,
      }
    }

    const rows = await runReviewDbQuery<DeviceLifecycleLogRow>(
      `
        SELECT
          l.id AS id,
          l.inventory_item_id AS inventoryItemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          l.related_inventory_item_id AS relatedInventoryItemId,
          ri.item_code AS relatedItemCode,
          ri.item_name AS relatedItemName,
          l.work_order_id AS workOrderId,
          l.trouble_ticket_id AS troubleTicketId,
          l.ticket_type AS ticketType,
          l.ticket_ref AS ticketRef,
          l.lifecycle_status AS lifecycleStatus,
          l.from_status AS fromStatus,
          l.event_type AS eventType,
          l.scan_source AS scanSource,
          l.target_team AS targetTeam,
          l.location_code AS locationCode,
          l.location_name AS locationName,
          l.validation_status AS validationStatus,
          l.notes AS notes,
          l.actor_user_id AS actorUserId,
          l.actor_name AS actorName,
          l.actor_role AS actorRole,
          l.created_at AS createdAt
        FROM inventory_device_lifecycle_logs l
        INNER JOIN inventory_items i
          ON i.id = l.inventory_item_id
        LEFT JOIN inventory_items ri
          ON ri.id = l.related_inventory_item_id
        WHERE ${where.join(' OR ')}
        ORDER BY l.id DESC
      `,
      values,
    )

    const byWorkOrder = new Map<number, DeviceLifecycleLogRow>()
    const byTroubleTicket = new Map<number, DeviceLifecycleLogRow>()

    for (const row of rows) {
      if (row.workOrderId && !byWorkOrder.has(row.workOrderId)) {
        byWorkOrder.set(row.workOrderId, row)
      }
      if (row.troubleTicketId && !byTroubleTicket.has(row.troubleTicketId)) {
        byTroubleTicket.set(row.troubleTicketId, row)
      }
    }

    return {
      source,
      byWorkOrder,
      byTroubleTicket,
      error: null as string | null,
    }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      byWorkOrder: new Map<number, DeviceLifecycleLogRow>(),
      byTroubleTicket: new Map<number, DeviceLifecycleLogRow>(),
      error: getReviewDbErrorDetail(error),
    }
  }
}

function getFallbackDataSource(source: DataSourceSnapshot, error: unknown): DataSourceSnapshot {
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return source
  }

  return {
    configuredMode: source.configuredMode,
    effectiveMode: 'mock',
    isFallback: true,
    label: 'Mock Fallback',
    detail: getReviewDbErrorDetail(error),
  }
}
