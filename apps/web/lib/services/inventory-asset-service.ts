import { runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

let inventoryAssetTableEnsured = false

export async function ensureInventoryAssetTable() {
  if (inventoryAssetTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS inventory_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      asset_type VARCHAR(40) NOT NULL,
      asset_name VARCHAR(180) NOT NULL,
      qty INT UNSIGNED NOT NULL DEFAULT 1,
      purchase_price DECIMAL(18,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_inventory_assets_type (asset_type)
    )
  `)

  inventoryAssetTableEnsured = true
}

