-- Read-only extraction pack untuk DB production Web PSB (PostgreSQL).
-- Jalankan hanya pada terminal app Coolify / lingkungan production yang punya akses DB internal.
-- Dilarang menambahkan query write pada file ini.

-- 1) Batch A: CoveredArea
SELECT
  "id",
  "name",
  "description",
  "createdAt",
  "updatedAt"
FROM "CoveredArea"
ORDER BY "id";

-- 2) Batch B: MarketingActivity
SELECT
  "id",
  "date",
  "marketingName",
  "activity",
  "notes",
  "areaId",
  "areaId2",
  "areaId3",
  "areaId4",
  "createdAt",
  "updatedAt"
FROM "MarketingActivity"
ORDER BY "id";

-- 3) Batch C: ODP Header
SELECT
  "id",
  "nama_odp",
  "lokasi",
  "kapasitas",
  "terpakai",
  "status_tiang",
  "is_active",
  "wilayah",
  "latitude",
  "longitude",
  "createdAt",
  "updatedAt"
FROM "psb_odp"
ORDER BY "id";

-- 4) Batch E: TroubleTicketSla
SELECT
  "id",
  "type",
  "durationDays",
  "createdAt",
  "updatedAt"
FROM "TroubleTicketSla"
ORDER BY "id";

-- 5) Row count ringkas untuk checklist mini-batch
SELECT 'CoveredArea' AS table_name, COUNT(*) AS total_rows FROM "CoveredArea"
UNION ALL
SELECT 'MarketingActivity' AS table_name, COUNT(*) AS total_rows FROM "MarketingActivity"
UNION ALL
SELECT 'psb_odp' AS table_name, COUNT(*) AS total_rows FROM "psb_odp"
UNION ALL
SELECT 'TroubleTicketSla' AS table_name, COUNT(*) AS total_rows FROM "TroubleTicketSla";
