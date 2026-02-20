# ============================================================================
# StatDeck - Deploy Page Transitions (PS 5.1 Compatible)
# ============================================================================

param(
    [string]$PiHost = "pi@192.168.1.84"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ScriptDir = "C:\Users\dcocc\Desktop\statdeck"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  StatDeck - Page Transitions Deploy" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verify files
$appJs = Join-Path $ScriptDir "app.js"
$transCss = Join-Path $ScriptDir "page-transitions.css"
$patchSh = Join-Path $ScriptDir "patch-pi-index.sh"

if (-not (Test-Path $appJs)) { Write-Host "ERROR: app.js not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $transCss)) { Write-Host "ERROR: page-transitions.css not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $patchSh)) { Write-Host "ERROR: patch-pi-index.sh not found" -ForegroundColor Red; exit 1 }

Write-Host "[OK] Files found" -ForegroundColor Green

# Backup
Write-Host ""
Write-Host "[1/5] Backing up on Pi..." -ForegroundColor Cyan
$bkCmd = 'cp ~/StatDeck/frontend/core/app.js ~/StatDeck/frontend/core/app.js.pre-transitions-' + $timestamp
ssh $PiHost $bkCmd
Write-Host "  -> app.js backed up" -ForegroundColor Green

# Stop Chromium
Write-Host ""
Write-Host "[2/5] Stopping Chromium..." -ForegroundColor Cyan
ssh $PiHost 'sudo pkill -9 chromium 2>/dev/null; sleep 1; echo stopped'
Write-Host "  -> Stopped" -ForegroundColor Green

# SCP files
Write-Host ""
Write-Host "[3/5] Deploying files..." -ForegroundColor Cyan

scp $appJs "${PiHost}:~/StatDeck/frontend/core/app.js"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: SCP app.js failed" -ForegroundColor Red; exit 1 }
Write-Host "  -> core/app.js" -ForegroundColor Green

scp $transCss "${PiHost}:~/StatDeck/frontend/styles/page-transitions.css"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: SCP page-transitions.css failed" -ForegroundColor Red; exit 1 }
Write-Host "  -> styles/page-transitions.css" -ForegroundColor Green

# Patch index.html via bash script (avoids PS quoting hell)
Write-Host ""
Write-Host "[4/5] Patching Pi index.html..." -ForegroundColor Cyan

scp $patchSh "${PiHost}:~/patch-pi-index.sh"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: SCP patch script failed" -ForegroundColor Red; exit 1 }

ssh $PiHost 'chmod +x ~/patch-pi-index.sh; bash ~/patch-pi-index.sh; rm -f ~/patch-pi-index.sh'
Write-Host "  -> index.html patched" -ForegroundColor Green

# Clear cache
Write-Host ""
Write-Host "[5/5] Clearing cache..." -ForegroundColor Cyan
ssh $PiHost 'rm -rf ~/.cache/chromium 2>/dev/null; echo cache_cleared'
Write-Host "  -> Cache cleared. Chromium restarting." -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DONE - Page transitions deployed" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Switch pages on Pi to see the animations" -ForegroundColor White
Write-Host ""
