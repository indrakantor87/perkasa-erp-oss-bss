param(
  [string]$RunnerRoot = "$env:TEMP\perkasa-web-runner"
)

$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $PSScriptRoot
$runnerRoot = [System.IO.Path]::GetFullPath($RunnerRoot)

function Invoke-NpmStep {
  param(
    [string]$Label,
    [string[]]$Arguments
  )

  & npm @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Label gagal dengan exit code $LASTEXITCODE."
  }
}

if (Test-Path $runnerRoot) {
  Remove-Item -Recurse -Force $runnerRoot
}

New-Item -ItemType Directory -Force $runnerRoot | Out-Null
Copy-Item -Recurse -Force (Join-Path $sourceRoot '*') $runnerRoot

Push-Location $runnerRoot
try {
  Invoke-NpmStep -Label 'npm install' -Arguments @('install')
  Invoke-NpmStep -Label 'npm run check' -Arguments @('run', 'check')
  Invoke-NpmStep -Label 'npm run test:smoke' -Arguments @('run', 'test:smoke')
}
finally {
  Pop-Location
}
