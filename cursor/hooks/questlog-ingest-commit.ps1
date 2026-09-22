# QuestLog — afterShellExecution: ingest-commit (fail-open)
# Prefer env QUESTLOG_ROOT = absolute path to the questlog monorepo.
$ErrorActionPreference = "Continue"

$questlogRoot = if ($env:QUESTLOG_ROOT) {
  $env:QUESTLOG_ROOT
} else {
  # EDIT ME if QUESTLOG_ROOT is not set:
  "C:\Users\YOU\path\to\questlog"
}

$inputJson = ""
try {
  $inputJson = [Console]::In.ReadToEnd()
} catch {}

if (-not $inputJson) {
  exit 0
}

$payload = $null
try {
  $payload = $inputJson | ConvertFrom-Json
} catch {
  exit 0
}

$command = ""
if ($null -ne $payload.command) { $command = [string]$payload.command }
if ($command -notmatch '(?i)git(\.exe)?(\s+|-C\s+\S+\s+)commit\b') {
  exit 0
}

$exitCode = $null
if ($null -ne $payload.exit_code) { $exitCode = $payload.exit_code }
elseif ($null -ne $payload.exitCode) { $exitCode = $payload.exitCode }
if ($null -ne $exitCode) {
  try {
    if ([int]$exitCode -ne 0) { exit 0 }
  } catch {}
}

$cwd = ""
if ($null -ne $payload.cwd) { $cwd = [string]$payload.cwd }
if (-not $cwd -or -not (Test-Path -LiteralPath $cwd)) {
  $cwd = (Get-Location).Path
}

if (-not (Test-Path -LiteralPath $questlogRoot)) {
  Write-Error "QUESTLOG_ROOT not found: $questlogRoot — set env or edit this script."
  exit 0
}

Push-Location -LiteralPath $cwd
try {
  & pnpm --dir $questlogRoot --filter @questlog/cli ingest-commit 2>&1 | Out-Host
} catch {
  Write-Error $_
} finally {
  Pop-Location
}

exit 0
