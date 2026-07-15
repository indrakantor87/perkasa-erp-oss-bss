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

type LoanCodeRow = {
  loanCode: string | null
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function ensureInventoryLoanColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('inventory_item_loans', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE inventory_item_loans
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('inventory_item_loans', columnName)
}

export async function ensureInventoryLoanTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS inventory_item_loans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        loan_code VARCHAR(40) NOT NULL,
        inventory_item_id BIGINT UNSIGNED NOT NULL,
        borrower_name VARCHAR(150) NOT NULL,
        borrower_division VARCHAR(120) NULL,
        borrower_subdivision VARCHAR(150) NULL,
        loan_qty INT UNSIGNED NOT NULL DEFAULT 1,
        returned_qty INT UNSIGNED NOT NULL DEFAULT 0,
        loan_status VARCHAR(30) NOT NULL DEFAULT 'BORROWED',
        borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        due_at DATETIME NULL,
        returned_at DATETIME NULL,
        loan_notes TEXT NULL,
        return_notes TEXT NULL,
        created_by VARCHAR(120) NOT NULL,
        processed_by VARCHAR(120) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_inventory_item_loans_code (loan_code),
        KEY idx_inventory_item_loans_status (loan_status),
        KEY idx_inventory_item_loans_item (inventory_item_id),
        CONSTRAINT fk_inventory_item_loans_item
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
      )
    `,
  )

  await ensureInventoryLoanColumn('borrower_division', 'borrower_division VARCHAR(120) NULL', 'borrower_name')
  await ensureInventoryLoanColumn(
    'borrower_subdivision',
    'borrower_subdivision VARCHAR(150) NULL',
    'borrower_division',
  )
  await ensureInventoryLoanColumn(
    'returned_qty',
    'returned_qty INT UNSIGNED NOT NULL DEFAULT 0',
    'loan_qty',
  )
}

export async function generateInventoryLoanCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `ILOAN-${year}${month}-%`

  const rows = await runReviewDbQuery<LoanCodeRow>(
    `
      SELECT loan_code AS loanCode
      FROM inventory_item_loans
      WHERE loan_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.loanCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `ILOAN-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}
