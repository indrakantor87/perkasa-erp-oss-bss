USE erp_isp_review;

SET SESSION group_concat_max_len = 20000;

SELECT
  COALESCE(reference_no, '') AS referenceNo,
  item_id AS itemId,
  movement_type AS movementType,
  qty,
  COUNT(*) AS duplicateCount,
  GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids,
  MIN(movement_at) AS firstMovementAt,
  MAX(movement_at) AS lastMovementAt
FROM inventory_stock_movements
GROUP BY COALESCE(reference_no, ''), item_id, movement_type, qty
HAVING COUNT(*) > 1
ORDER BY duplicateCount DESC, referenceNo ASC, itemId ASC;

SELECT
  COALESCE(reference_no, '') AS referenceNo,
  COUNT(*) AS totalRows,
  COUNT(DISTINCT CONCAT(item_id, '|', movement_type, '|', qty)) AS distinctKeyCount
FROM inventory_stock_movements
GROUP BY COALESCE(reference_no, '')
HAVING COUNT(*) > COUNT(DISTINCT CONCAT(item_id, '|', movement_type, '|', qty))
ORDER BY (COUNT(*) - COUNT(DISTINCT CONCAT(item_id, '|', movement_type, '|', qty))) DESC,
  COUNT(*) DESC,
  referenceNo ASC;
