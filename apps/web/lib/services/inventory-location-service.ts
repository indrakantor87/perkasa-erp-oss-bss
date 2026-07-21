import { invalidateReviewDbColumnCache, runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

let inventoryLocationsTableEnsured = false

const defaultInventoryLocations = [
  ['GA-STOCK', 'Inventory / GA', 'WAREHOUSE'],
  ['NOC-BENCH', 'NOC Bench', 'WORKSHOP'],
  ['FIELD-BARAT', 'Field Barat', 'FIELD'],
  ['SITE-BARAT', 'Site Barat', 'SITE'],
  ['PSB-EAST', 'PSB East', 'FIELD'],
] as const

export async function ensureInventoryLocationsTable() {
  if (inventoryLocationsTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS inventory_locations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      location_code VARCHAR(100) NOT NULL,
      location_name VARCHAR(190) NOT NULL,
      location_type VARCHAR(80) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_inventory_locations_code (location_code),
      KEY idx_inventory_locations_type (location_type),
      KEY idx_inventory_locations_active (is_active)
    )
  `)

  for (const [locationCode, locationName, locationType] of defaultInventoryLocations) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO inventory_locations (
          location_code,
          location_name,
          location_type,
          is_active
        )
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          location_name = VALUES(location_name),
          location_type = VALUES(location_type),
          is_active = 1
      `,
      [locationCode, locationName, locationType],
    )
  }

  invalidateReviewDbColumnCache('inventory_locations')
  inventoryLocationsTableEnsured = true
}
