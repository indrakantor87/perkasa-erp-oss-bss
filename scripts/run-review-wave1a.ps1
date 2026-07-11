param(
  [ValidateSet('Wave1AOnly', 'Full')]
  [string]$Mode = 'Wave1AOnly',
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
    'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
    'C:\Program Files\MariaDB 10.4\bin\mysql.exe',
    'C:\Program Files\MariaDB 10.5\bin\mysql.exe',
    'C:\Program Files\MariaDB 10.6\bin\mysql.exe',
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
  'database/xampp_review_patch_wave_1a_existing_review_db.sql',
  'database/xampp_review_master_mapping.sql',
  'database/xampp_review_core_master_seed.sql',
  'database/xampp_review_auth_seed.sql',
  'database/xampp_review_master_mapping_seed.sql',
  'database/xampp_review_sample_import.sql',
  'database/xampp_review_transform_stage_2.sql',
  'database/xampp_review_transform_stage_3.sql',
  'database/xampp_review_sample_import_wave_1a.sql',
  'database/xampp_review_transform_wave_1a_support_extension.sql',
  'database/xampp_review_transform_wave_1a_network_odp.sql'
)

$wave1aOnlySequence = @(
  'database/xampp_review_patch_wave_1a_existing_review_db.sql',
  'database/xampp_review_sample_import_wave_1a.sql',
  'database/xampp_review_transform_wave_1a_support_extension.sql',
  'database/xampp_review_transform_wave_1a_network_odp.sql'
)

$sequence = if ($Mode -eq 'Full') { $fullSequence } else { $wave1aOnlySequence }

Write-Host ("Mode: " + $Mode)
Write-Host ("Database: " + $Database)
Write-Host ("Mysql: " + $mysqlExe)
Write-Host ''

foreach ($relativePath in $sequence) {
  Invoke-SqlFile -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -FilePath (Join-Path $repoRoot $relativePath)
}

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Batch Wave 1A Support Extension' -Query @"
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001';
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging Support Extension Rows' -Query @"
SELECT support_type, legacy_id, legacy_parent_id, target_isolation_id, target_trouble_ticket_id, target_dismantle_queue_id, target_trouble_ticket_sla_id, import_status
FROM staging_legacy_support_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Dismantle Queue' -Query @"
SELECT id, isolation_id, transfer_note, transferred_by_username, transferred_at
FROM support_dismantle_queue
ORDER BY id DESC
LIMIT 5;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Trouble Ticket Photos' -Query @"
SELECT id, trouble_ticket_id, photo_path
FROM support_trouble_ticket_photos
ORDER BY id DESC
LIMIT 5;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Trouble Ticket SLA' -Query @"
SELECT id, trouble_type, duration_days
FROM support_trouble_ticket_sla
ORDER BY id DESC
LIMIT 10;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Batch Wave 1A ODP Header' -Query @"
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001';
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Staging ODP Header Rows' -Query @"
SELECT legacy_id, odp_code, total_ports, active_ports, target_odp_id, import_status
FROM staging_legacy_network_odp_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001'
)
ORDER BY id;
"@

Invoke-ReviewQuery -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -Title 'Final Network ODP' -Query @"
SELECT id, code, name, total_ports, active_ports
FROM network_odp
ORDER BY id DESC
LIMIT 10;
"@

Write-Host ''
Write-Host 'Runner Wave 1A selesai.'
