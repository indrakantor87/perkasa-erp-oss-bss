param(
  [ValidateSet('Wave1BTicketOnly', 'Full')]
  [string]$Mode = 'Wave1BTicketOnly',
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
  'database/xampp_review_sample_import_wave_1b_ticket.sql',
  'database/xampp_review_transform_wave_1b_ticket.sql'
)

$wave1bOnlySequence = @(
  'database/xampp_review_sample_import_wave_1b_ticket.sql',
  'database/xampp_review_transform_wave_1b_ticket.sql'
)

$sequence = if ($Mode -eq 'Full') { $fullSequence } else { $wave1bOnlySequence }

Write-Host ("Mode: " + $Mode)
Write-Host ("Database: " + $Database)
Write-Host ("Mysql: " + $mysqlExe)
Write-Host ''

foreach ($relativePath in $sequence) {
  Invoke-SqlFile -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -FilePath (Join-Path $repoRoot $relativePath)
}

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Batch Wave 1B Ticket' -Query @"
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001';
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging Customer Ticket Rows' -Query @"
SELECT legacy_id, customer_name, target_customer_id, target_address_id, import_status
FROM staging_legacy_customer_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging Order Ticket Rows' -Query @"
SELECT legacy_id, order_no, mapped_package_code, target_customer_id, target_order_id, target_subscription_id, target_work_order_id, import_status
FROM staging_legacy_order_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Customers Wave 1B Ticket' -Query @"
SELECT c.id, c.customer_code, c.full_name, c.phone
FROM crm_customers c
JOIN staging_legacy_customer_records sc
  ON sc.target_customer_id = c.id
WHERE sc.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY c.id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Sales Orders Wave 1B Ticket' -Query @"
SELECT o.id, o.customer_id, o.order_no, o.status, o.request_date, o.scheduled_installation_at, o.marketing_name, o.teknisi_name
FROM sales_orders o
JOIN staging_legacy_order_records so
  ON so.target_order_id = o.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY o.id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Subscriptions Wave 1B Ticket' -Query @"
SELECT ss.id, ss.customer_id, ss.order_id, ss.service_no, ss.status, ss.activated_at
FROM service_subscriptions ss
JOIN staging_legacy_order_records so
  ON so.target_subscription_id = ss.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY ss.id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Work Orders Wave 1B Ticket' -Query @"
SELECT wo.id, wo.sales_order_id, wo.subscription_id, wo.work_order_no, wo.work_type, wo.status, wo.technician_name, wo.scheduled_at, wo.completed_at
FROM service_work_orders wo
JOIN staging_legacy_order_records so
  ON so.target_work_order_id = wo.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY wo.id;
"@

Write-Host ''
Write-Host 'Runner Wave 1B Ticket selesai.'
