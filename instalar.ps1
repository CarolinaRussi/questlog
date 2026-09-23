# QuestLog — first-run installer (Windows).
# Double-click instalar.bat, or: powershell -ExecutionPolicy Bypass -File .\instalar.ps1
param(
  [switch] $Gran,
  [switch] $SkipStartup
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Write-Step([string] $message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Refresh-Path {
  $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Ensure-Node {
  Refresh-Path
  if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Node.js ok: $(node -v)"
    return
  }

  Write-Step "Node.js não encontrado. Tentando instalar (pode pedir permissão)…"
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Instale o Node.js LTS em https://nodejs.org/ (marque Add to PATH) e rode este instalador de novo." -ForegroundColor Yellow
    exit 1
  }
}

function Ensure-Pnpm {
  Refresh-Path
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-Host "pnpm ok: $(pnpm -v)"
    return
  }

  Write-Step "Instalando pnpm…"
  if (Get-Command corepack -ErrorAction SilentlyContinue) {
    corepack enable
    corepack prepare pnpm@10.19.0 --activate
  } else {
    npm install -g pnpm
  }
  Refresh-Path

  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Não achei o pnpm no PATH. Feche este instalador, abra de novo e tente outra vez." -ForegroundColor Yellow
    exit 1
  }
}

function New-DesktopShortcut([string] $exePath) {
  $desktop = [Environment]::GetFolderPath("Desktop")
  $link = Join-Path $desktop "QuestLog.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($link)
  $shortcut.TargetPath = $exePath
  $shortcut.WorkingDirectory = Split-Path $exePath
  $shortcut.Description = "QuestLog"
  $shortcut.Save()
  return $link
}

Write-Host "QuestLog — instalação automática"
Write-Host "Pasta: $PSScriptRoot"

Ensure-Node
Ensure-Pnpm

if (-not (Test-Path -LiteralPath ".env") -and (Test-Path -LiteralPath ".env.example")) {
  Copy-Item ".env.example" ".env"
}

Write-Step "Baixando dependências…"
pnpm setup

$seedName = if ($Gran) { "gran" } else { "minimal" }
Write-Step "Criando perfil inicial ($seedName)…"
pnpm seed -- $seedName

Write-Step "Gerando o programa (demora alguns minutos na primeira vez)…"
pnpm desktop:pack

$unpacked = Join-Path $PSScriptRoot "apps\desktop\release\win-unpacked\QuestLog.exe"
$portable = Join-Path $PSScriptRoot "apps\desktop\release\QuestLog.exe"
$exePath = if (Test-Path -LiteralPath $unpacked) { $unpacked } else { $portable }

if (-not (Test-Path -LiteralPath $exePath)) {
  Write-Host "O .exe não apareceu. Veja se o passo anterior teve erro." -ForegroundColor Yellow
  exit 1
}

if (-not $SkipStartup) {
  Write-Step "Registrando abertura no login do Windows…"
  pnpm desktop:startup
}

Write-Step "Atalho na Área de Trabalho…"
$desktopLink = New-DesktopShortcut $exePath

Write-Host ""
Write-Host "Pronto." -ForegroundColor Green
Write-Host "Programa: $exePath"
Write-Host "Atalho:   $desktopLink"
Write-Host ""
Write-Host "Abra o QuestLog e vá em Settings: pastas dos repos, Jira e Gemini (os dois últimos são opcionais)."
Write-Host "O Windows pode avisar que o app não é assinado — se você gerou daqui, pode avançar."

Start-Process -FilePath $exePath
