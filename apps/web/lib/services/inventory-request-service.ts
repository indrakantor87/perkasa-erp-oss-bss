import {
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
} from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type RequestCodeRow = {
  requestCode: string | null
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function ensureInventoryRequestColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('inventory_item_requests', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE inventory_item_requests
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('inventory_item_requests', columnName)
}

export async function ensureInventoryRequestTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS inventory_item_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        request_code VARCHAR(40) NOT NULL,
        inventory_item_id BIGINT UNSIGNED NOT NULL,
        work_order_id BIGINT UNSIGNED NULL,
        trouble_ticket_id BIGINT UNSIGNED NULL,
        requested_by_user_id BIGINT UNSIGNED NULL,
        processed_by_user_id BIGINT UNSIGNED NULL,
        request_qty INT UNSIGNED NOT NULL DEFAULT 1,
        request_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
        request_status VARCHAR(30) NOT NULL DEFAULT 'REQUEST',
        requested_division VARCHAR(120) NULL,
        requested_subdivision VARCHAR(150) NULL,
        requested_for VARCHAR(150) NULL,
        request_notes TEXT NULL,
        pending_reason TEXT NULL,
        requested_by VARCHAR(120) NOT NULL,
        processed_by VARCHAR(120) NULL,
        requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_inventory_item_requests_code (request_code),
        KEY idx_inventory_item_requests_status (request_status),
        KEY idx_inventory_item_requests_item (inventory_item_id),
        KEY idx_inventory_item_requests_wo (work_order_id),
        KEY idx_inventory_item_requests_ticket (trouble_ticket_id),
        CONSTRAINT fk_inventory_item_requests_item
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
      )
    `,
  )

  await ensureInventoryRequestColumn(
    'work_order_id',
    'work_order_id BIGINT UNSIGNED NULL',
    'inventory_item_id',
  )
  await ensureInventoryRequestColumn(
    'trouble_ticket_id',
    'trouble_ticket_id BIGINT UNSIGNED NULL',
    'work_order_id',
  )
  await ensureInventoryRequestColumn(
    'requested_by_user_id',
    'requested_by_user_id BIGINT UNSIGNED NULL',
    'trouble_ticket_id',
  )
  await ensureInventoryRequestColumn(
    'processed_by_user_id',
    'processed_by_user_id BIGINT UNSIGNED NULL',
    'requested_by_user_id',
  )
  await ensureInventoryRequestColumn(
    'request_type',
    "request_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL'",
    'request_qty',
  )
  await ensureInventoryRequestColumn(
    'requested_division',
    'requested_division VARCHAR(120) NULL',
    'request_status',
  )
  await ensureInventoryRequestColumn(
    'requested_subdivision',
    'requested_subdivision VARCHAR(150) NULL',
    'requested_division',
  )
}

export async function generateInventoryRequestCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `IREQ-${year}${month}-%`

  const rows = await runReviewDbQuery<RequestCodeRow>(
    `
      SELECT request_code AS requestCode
      FROM inventory_item_requests
      WHERE request_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.requestCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `IREQ-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}
