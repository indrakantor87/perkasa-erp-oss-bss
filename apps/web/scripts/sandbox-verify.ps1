param(
  [string]$RunnerRoot = "$env:TEMP\perkasa-web-runner"
)

$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $PSScriptRoot
$runnerRoot = [System.IO.Path]::GetFullPath($RunnerRoot)

if (Test-Path $runnerRoot) {
  Remove-Item -Recurse -Force $runnerRoot
}

New-Item -ItemType Directory -Force $runnerRoot | Out-Null
Copy-Item -Recurse -Force (Join-Path $sourceRoot '*') $runnerRoot

Push-Location $runnerRoot
try {
  npm install
  npm run check
  npm run test:smoke
}
finally {
  Pop-Location
}
