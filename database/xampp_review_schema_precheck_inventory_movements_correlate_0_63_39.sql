USE erp_isp_review;

SET SESSION group_concat_max_len = 20000;

WITH duplicate_keys AS (
  SELECT
    item_id,
    COALESCE(reference_no, '') AS reference_no,
    movement_type,
    qty,
    COUNT(*) AS duplicate_count
  FROM inventory_stock_movements
  GROUP BY item_id, COALESCE(reference_no, ''), movement_type, qty
  HAVING COUNT(*) > 1
),
movement_rows AS (
  SELECT
    m.id AS movement_id,
    m.item_id,
    COALESCE(m.reference_no, '') AS reference_no,
    m.movement_type,
    m.qty,
    m.unit_price,
    m.movement_at,
    m.created_at
  FROM inventory_stock_movements m
  JOIN duplicate_keys d
    ON d.item_id = m.item_id
   AND d.reference_no = COALESCE(m.reference_no, '')
   AND d.movement_type = m.movement_type
   AND d.qty = m.qty
)
SELECT
  mr.reference_no AS referenceNo,
  mr.item_id AS itemId,
  mr.movement_type AS movementType,
  mr.qty,
  COUNT(*) AS duplicateCount,
  GROUP_CONCAT(mr.movement_id ORDER BY mr.movement_id SEPARATOR ',') AS movementIds,
  COUNT(DISTINCT s.batch_id) AS batchCount,
  GROUP_CONCAT(DISTINCT s.batch_id ORDER BY s.batch_id SEPARATOR ',') AS batchIds,
  COUNT(DISTINCT s.target_movement_id) AS mappedCount,
  SUM(CASE WHEN s.id IS NULL THEN 1 ELSE 0 END) AS unmappedCount,
  GROUP_CONCAT(DISTINCT CONCAT(s.batch_id, ':', COALESCE(s.legacy_id,''), ':', COALESCE(s.import_status,'')) ORDER BY s.batch_id SEPARATOR ' | ') AS stagingHints
FROM movement_rows mr
LEFT JOIN staging_legacy_inventory_movement_records s
  ON s.target_movement_id = mr.movement_id
GROUP BY mr.reference_no, mr.item_id, mr.movement_type, mr.qty
ORDER BY duplicateCount DESC, referenceNo ASC, itemId ASC;

SELECT
  mr.movement_id AS movementId,
  mr.reference_no AS referenceNo,
  mr.item_id AS itemId,
  mr.movement_type AS movementType,
  mr.qty,
  mr.unit_price AS unitPrice,
  mr.movement_at AS movementAt,
  mr.created_at AS createdAt,
  s.batch_id AS stagingBatchId,
  s.source_system AS stagingSourceSystem,
  s.movement_source AS stagingMovementSource,
  s.legacy_id AS stagingLegacyId,
  s.legacy_item_id AS stagingLegacyItemId,
  s.import_status AS stagingImportStatus,
  s.imported_at AS stagingImportedAt
FROM movement_rows mr
LEFT JOIN staging_legacy_inventory_movement_records s
  ON s.target_movement_id = mr.movement_id
ORDER BY mr.reference_no ASC, mr.item_id ASC, mr.movement_type ASC, mr.qty ASC, mr.movement_id ASC;
