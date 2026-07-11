param(
  [ValidateSet('Wave1CSalesOdpOnly', 'Full')]
  [string]$Mode = 'Wave1CSalesOdpOnly',
  [string]$Database = 'erp_isp_review',
  [string]$DbHost = '127.0.0.1',
  [int]$Port = 3306,
  [string]$User = 'root',
  [string]$Password = '',
  [string]$MysqlPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-MysqlExe {
  param(
    [string]$PreferredPath
  )

  if ($PreferredPath) {
    if (Test-Path $PreferredPath) {
      return (Resolve-Path $PreferredPath).Path
    }

    throw "MysqlPath tidak ditemukan: $PreferredPath"
  }

  $command = Get-Command mysql -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    'C:\xampp\mysql\bin\mysql.exe',
    'D:\xampp\mysql\bin\mysql.exe',
    'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
    'C:\Program Files\MariaDB 10.11\bin\mysql.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw 'mysql.exe tidak ditemukan. Install client MySQL/MariaDB atau berikan -MysqlPath "C:\path\to\mysql.exe".'
}

function Get-MysqlArgs {
  param(
    [string]$DbName,
    [string]$DbHost,
    [int]$DbPort,
    [string]$DbUser,
    [string]$DbPassword
  )

  $args = @(
    '--protocol=TCP',
    "--host=$DbHost",
    "--port=$DbPort",
    "--user=$DbUser",
    '--default-character-set=utf8mb4',
    '--show-warnings',
    $DbName
  )

  if ($DbPassword -ne '') {
    $args += "--password=$DbPassword"
  }

  return $args
}

function Invoke-SqlFile {
  param(
    [string]$MysqlExe,
    [string[]]$MysqlArgs,
    [string]$FilePath
  )

  $resolvedFile = (Resolve-Path $FilePath).Path
  Write-Host ("[RUN] " + $resolvedFile)

  $content = Get-Content -Raw -Path $resolvedFile
  $content | & $MysqlExe @MysqlArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Eksekusi SQL gagal: $resolvedFile (exit code $LASTEXITCODE)"
  }
}

function Invoke-ReviewQuery {
  param(
    [string]$MysqlExe,
    [string[]]$MysqlArgs,
    [string]$Title,
    [string]$Query
  )

  Write-Host ''
  Write-Host ("[REVIEW] " + $Title)
  & $MysqlExe @MysqlArgs '--table' '-e' $Query

  if ($LASTEXITCODE -ne 0) {
    throw "Review query gagal: $Title (exit code $LASTEXITCODE)"
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$mysqlExe = Resolve-MysqlExe -PreferredPath $MysqlPath
$mysqlArgs = Get-MysqlArgs -DbName $Database -DbHost $DbHost -DbPort $Port -DbUser $User -DbPassword $Password

$fullSequence = @(
  'database/xampp_review_schema.sql',
  'database/xampp_review_schema_phase_1_1.sql',
  'database/xampp_review_staging_import.sql',
  'database/xampp_review_master_mapping.sql',
  'database/xampp_review_core_master_seed.sql',
  'database/xampp_review_auth_seed.sql',
  'database/xampp_review_master_mapping_seed.sql',
  'database/xampp_review_sample_import_wave_1a.sql',
  'database/xampp_review_transform_wave_1a_network_odp.sql',
  'database/xampp_review_patch_wave_1c_existing_review_db.sql',
  'database/xampp_review_sample_import_wave_1c_sales.sql',
  'database/xampp_review_transform_wave_1c_sales.sql',
  'database/xampp_review_bootstrap_wave_1c_odp_ports.sql'
)

$wave1cOnlySequence = @(
  'database/xampp_review_patch_wave_1c_existing_review_db.sql',
  'database/xampp_review_sample_import_wave_1c_sales.sql',
  'database/xampp_review_transform_wave_1c_sales.sql',
  'database/xampp_review_bootstrap_wave_1c_odp_ports.sql'
)

$sequence = if ($Mode -eq 'Full') { $fullSequence } else { $wave1cOnlySequence }

Write-Host ("Mode: " + $Mode)
Write-Host ("Database: " + $Database)
Write-Host ("Mysql: " + $mysqlExe)
Write-Host ''

foreach ($relativePath in $sequence) {
  Invoke-SqlFile -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -FilePath (Join-Path $repoRoot $relativePath)
}

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Batch Wave 1C Sales' -Query @"
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code IN ('SAMPLE-WEBPSB-COVERAGE-001', 'SAMPLE-WEBPSB-MARKETING-001')
ORDER BY batch_code;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging Coverage Rows' -Query @"
SELECT legacy_id, area_code, area_name, target_covered_area_id, import_status
FROM staging_legacy_sales_coverage_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-COVERAGE-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging Marketing Activity Rows' -Query @"
SELECT legacy_id, marketing_name, activity_type, target_activity_id, import_status
FROM staging_legacy_marketing_activity_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging Marketing Activity Area Rows' -Query @"
SELECT legacy_activity_id, legacy_area_id, sort_order, target_activity_id, target_covered_area_id, import_status
FROM staging_legacy_marketing_activity_area_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Covered Areas Wave 1C' -Query @"
SELECT id, area_code, area_name, coverage_status, city, province
FROM sales_covered_areas
WHERE area_code IN ('PSB-AREA-000001', 'PSB-AREA-000002')
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Marketing Activities Wave 1C' -Query @"
SELECT id, activity_date, marketing_name, activity_type, source_system, legacy_id
FROM sales_marketing_activities
WHERE source_system = 'WEB_PSB'
  AND legacy_id = 'MA-001'
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Marketing Activity Areas Wave 1C' -Query @"
SELECT maa.id, maa.activity_id, maa.covered_area_id, maa.sort_order
FROM sales_marketing_activity_areas maa
JOIN sales_marketing_activities ma
  ON ma.id = maa.activity_id
WHERE ma.source_system = 'WEB_PSB'
  AND ma.legacy_id = 'MA-001'
ORDER BY maa.sort_order;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Network ODP Port Summary' -Query @"
SELECT o.id, o.code, o.name, o.total_ports, COUNT(p.id) AS generated_ports
FROM network_odp o
LEFT JOIN network_odp_ports p
  ON p.odp_id = o.id
WHERE o.code = 'TRKL/07 - 16'
GROUP BY o.id, o.code, o.name, o.total_ports;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Sample Network ODP Ports' -Query @"
SELECT p.id, p.odp_id, p.port_no, p.port_status, p.notes
FROM network_odp_ports p
JOIN network_odp o
  ON o.id = p.odp_id
WHERE o.code = 'TRKL/07 - 16'
ORDER BY p.port_no
LIMIT 8;
"@

Write-Host ''
Write-Host 'Runner Wave 1C Sales + ODP selesai.'
