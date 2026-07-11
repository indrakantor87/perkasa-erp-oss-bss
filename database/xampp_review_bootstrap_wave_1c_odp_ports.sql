-- Jalankan file ini setelah `network_odp` sudah memiliki header ODP.
-- Bootstrap ini tidak menebak port mana yang `USED`; seluruh slot awal dibentuk sebagai `AVAILABLE`.

USE erp_isp_review;

INSERT INTO network_odp_ports (
  odp_id,
  port_no,
  port_status,
  splitter_slot,
  core_label,
  subscription_id,
  customer_id,
  installed_at,
  notes
)
WITH RECURSIVE seq AS (
  SELECT 1 AS port_no
  UNION ALL
  SELECT port_no + 1
  FROM seq
  WHERE port_no < 256
)
SELECT
  o.id,
  seq.port_no,
  'AVAILABLE',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  CONCAT(
    'bootstrap native Wave 1C dari header ODP; occupancy aggregate legacy=',
    o.active_ports,
    ' tanpa pemetaan port-by-port'
  )
FROM network_odp o
JOIN seq
  ON seq.port_no <= o.total_ports
LEFT JOIN network_odp_ports p
  ON p.odp_id = o.id
  AND p.port_no = seq.port_no
WHERE o.total_ports > 0
  AND p.id IS NULL;
