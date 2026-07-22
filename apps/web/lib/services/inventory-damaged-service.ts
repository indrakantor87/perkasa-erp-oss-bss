import { runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

let inventoryDamagedTableEnsured = false

export async function ensureInventoryDamagedTable() {
  if (inventoryDamagedTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS inventory_damaged_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      damaged_date DATE NOT NULL,
      item_name VARCHAR(180) NOT NULL,
      qty INT UNSIGNED NOT NULL DEFAULT 1,
      purchase_price DECIMAL(18,2) NOT NULL DEFAULT 0,
      selling_price DECIMAL(18,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_inventory_damaged_date (damaged_date)
    )
  `)

  inventoryDamagedTableEnsured = true
}

