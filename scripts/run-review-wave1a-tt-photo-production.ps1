param(
  [ValidateSet('Wave1ATTPhotoProductionOnly')]
  [string]$Mode = 'Wave1ATTPhotoProductionOnly',
  [string]$Database = 'erp_isp_review',
  [string]$DbHost = '127.0.0.1',
  [int]$Port = 3306,
  [string]$User = 'root',
  [string]$Password = '',
  [string]$MysqlPath = '',
  [string]$JsonDir = '',
  [string]$GeneratedSqlPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-Executable {
  param(
    [string]$PreferredPath,
    [string]$CommandName,
    [string[]]$Candidates,
    [string]$MissingMessage
  )

  if ($PreferredPath) {
    if (Test-Path $PreferredPath) {
      return (Resolve-Path $PreferredPath).Path
    }

    throw "$CommandName tidak ditemukan: $PreferredPath"
  }

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($candidate in $Candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw $MissingMessage
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
    '--max_allowed_packet=64M',
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

function Invoke-ReviewFile {
  param(
    [string]$MysqlExe,
    [string[]]$MysqlArgs,
    [string]$FilePath
  )

  $resolvedFile = (Resolve-Path $FilePath).Path
  Write-Host ''
  Write-Host ("[REVIEW FILE] " + $resolvedFile)

  $content = Get-Content -Raw -Path $resolvedFile
  $content | & $MysqlExe @MysqlArgs '--table'

  if ($LASTEXITCODE -ne 0) {
    throw "Eksekusi review SQL gagal: $resolvedFile (exit code $LASTEXITCODE)"
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot

$mysqlExe = Resolve-Executable -PreferredPath $MysqlPath -CommandName 'mysql' -Candidates @(
  'C:\xampp\mysql\bin\mysql.exe',
  'D:\xampp\mysql\bin\mysql.exe',
  'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  'C:\Program Files\MariaDB 10.11\bin\mysql.exe'
) -MissingMessage 'mysql.exe tidak ditemukan. Install client MySQL/MariaDB atau berikan -MysqlPath "C:\path\to\mysql.exe".'

$nodeExe = Resolve-Executable -PreferredPath '' -CommandName 'node' -Candidates @() -MissingMessage 'node.exe tidak ditemukan di PATH. Install Node.js atau tambahkan ke PATH.'

$jsonDirectory = if ($JsonDir) {
  (Resolve-Path $JsonDir).Path
} else {
  Join-Path $repoRoot 'production-data\web-psb-wave1a-tt-photo'
}

if (-not (Test-Path $jsonDirectory)) {
  throw "Folder JSON production TT photo tidak ditemukan: $jsonDirectory"
}

$generatedSqlFile = if ($GeneratedSqlPath) {
  $GeneratedSqlPath
} else {
  Join-Path $repoRoot 'database\generated\web_psb_wave1a_tt_photo_production_loader.sql'
}

$generatorScript = Join-Path $repoRoot 'scripts\generate-wave1a-tt-photo-production-loader.mjs'
$mysqlArgs = Get-MysqlArgs -DbName $Database -DbHost $DbHost -DbPort $Port -DbUser $User -DbPassword $Password

Write-Host ("Mode: " + $Mode)
Write-Host ("Database: " + $Database)
Write-Host ("Mysql: " + $mysqlExe)
Write-Host ("Node: " + $nodeExe)
Write-Host ("JsonDir: " + $jsonDirectory)
Write-Host ("GeneratedSql: " + $generatedSqlFile)
Write-Host ''

& $nodeExe $generatorScript '--input-dir' $jsonDirectory '--output-file' $generatedSqlFile
if ($LASTEXITCODE -ne 0) {
  throw "Generator SQL Wave 1A TT Photo production gagal dijalankan (exit code $LASTEXITCODE)."
}

$sequence = @(
  'database/xampp_review_patch_wave_1a_existing_review_db.sql',
  $generatedSqlFile,
  'database/xampp_review_transform_wave1a_tt_photo_production.sql'
)

foreach ($relativePath in $sequence) {
  $filePath = if ([System.IO.Path]::IsPathRooted($relativePath)) {
    $relativePath
  } else {
    Join-Path $repoRoot $relativePath
  }

  Invoke-SqlFile -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -FilePath $filePath
}

Invoke-ReviewFile -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -FilePath (Join-Path $repoRoot 'database/xampp_review_wave1a_tt_photo_production_review_queries.sql')
Invoke-ReviewFile -MysqlExe $mysqlExe -MysqlArgs $mysqlArgs -FilePath (Join-Path $repoRoot 'database/xampp_review_wave1a_tt_photo_production_assertions.sql')

Write-Host ''
Write-Host 'Runner Wave 1A TT Photo production selesai.'
