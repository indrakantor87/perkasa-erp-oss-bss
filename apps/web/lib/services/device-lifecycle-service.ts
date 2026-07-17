import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
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
  | 'REPLACE'
  | 'PENDING_NOC_VALIDATION'
  | 'INSTALLED'
  | 'DAMAGED'
  | 'RETURNED'

export type DeviceLifecycleLogRow = {
  id: number
  inventoryItemId: number
  itemCode: string | null
  itemName: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  lifecycleStatus: DeviceLifecycleStatus | null
  eventType: string | null
  scanSource: string | null
  targetTeam: string | null
  notes: string | null
  actorUserId: number | null
  actorName: string | null
  actorRole: string | null
  createdAt: string | null
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

export async function ensureInventoryDeviceLifecycleTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS inventory_device_lifecycle_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        inventory_item_id BIGINT UNSIGNED NOT NULL,
        work_order_id BIGINT UNSIGNED NULL,
        trouble_ticket_id BIGINT UNSIGNED NULL,
        lifecycle_status VARCHAR(50) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        scan_source VARCHAR(50) NULL,
        target_team VARCHAR(100) NULL,
        notes TEXT NULL,
        actor_user_id BIGINT UNSIGNED NULL,
        actor_name VARCHAR(190) NULL,
        actor_role VARCHAR(50) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_inventory_device_lifecycle_item (inventory_item_id),
        KEY idx_inventory_device_lifecycle_wo (work_order_id),
        KEY idx_inventory_device_lifecycle_tt (trouble_ticket_id),
        KEY idx_inventory_device_lifecycle_status (lifecycle_status),
        KEY idx_inventory_device_lifecycle_created (created_at),
        CONSTRAINT fk_inventory_device_lifecycle_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
        CONSTRAINT fk_inventory_device_lifecycle_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id),
        CONSTRAINT fk_inventory_device_lifecycle_tt FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id)
      )
    `,
  )
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
          l.work_order_id AS workOrderId,
          l.trouble_ticket_id AS troubleTicketId,
          l.lifecycle_status AS lifecycleStatus,
          l.event_type AS eventType,
          l.scan_source AS scanSource,
          l.target_team AS targetTeam,
          l.notes AS notes,
          l.actor_user_id AS actorUserId,
          l.actor_name AS actorName,
          l.actor_role AS actorRole,
          l.created_at AS createdAt
        FROM inventory_device_lifecycle_logs l
        INNER JOIN inventory_items i
          ON i.id = l.inventory_item_id
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
          l.work_order_id AS workOrderId,
          l.trouble_ticket_id AS troubleTicketId,
          l.lifecycle_status AS lifecycleStatus,
          l.event_type AS eventType,
          l.scan_source AS scanSource,
          l.target_team AS targetTeam,
          l.notes AS notes,
          l.actor_user_id AS actorUserId,
          l.actor_name AS actorName,
          l.actor_role AS actorRole,
          l.created_at AS createdAt
        FROM inventory_device_lifecycle_logs l
        INNER JOIN inventory_items i
          ON i.id = l.inventory_item_id
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
