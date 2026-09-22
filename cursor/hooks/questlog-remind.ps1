# QuestLog — sessionStart: remind (copy to ~/.cursor/hooks/)
# Prefer env QUESTLOG_ROOT = absolute path to the questlog monorepo.
$ErrorActionPreference = "Continue"

$questlogRoot = if ($env:QUESTLOG_ROOT) {
  $env:QUESTLOG_ROOT
} else {
  # EDIT ME if QUESTLOG_ROOT is not set:
  "C:\Users\YOU\path\to\questlog"
}

try {
  $null = [Console]::In.ReadToEnd()
} catch {}

if (-not (Test-Path -LiteralPath $questlogRoot)) {
  Write-Error "QUESTLOG_ROOT not found: $questlogRoot — set env or edit this script."
  exit 0
}

& pnpm --dir $questlogRoot --filter @questlog/cli remind 2>&1 | Out-Host
exit 0
