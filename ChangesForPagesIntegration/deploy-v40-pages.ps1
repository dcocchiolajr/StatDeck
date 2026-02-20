# ============================================================================
# StatDeck v4.0 Multi-Page Deploy Script (PowerShell 5.1 Compatible)
# ============================================================================
#
# PHASE 0: Full Pi backup to local PC + Config App backup
# PHASE 1: Pi deploy (SCP new files)
# PHASE 2: Config App deploy (replace + patch files)
#
# USAGE:
#   .\deploy-v40-pages.ps1                       # Full backup + deploy
#   .\deploy-v40-pages.ps1 -BackupOnly           # Just backup, no deploy
#   .\deploy-v40-pages.ps1 -SkipPi               # Config App only
#   .\deploy-v40-pages.ps1 -SkipApp              # Pi only
#
# ============================================================================

param(
    [string]$PiHost = "pi@192.168.1.84",
    [string]$PiPath = "~/StatDeck",
    [switch]$SkipPi,
    [switch]$SkipApp,
    [switch]$BackupOnly
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# ---- PATHS ----
# Script and new files are all in C:\Users\dcocc\Desktop\statdeck\
$ScriptDir      = "C:\Users\dcocc\Desktop\statdeck"
$ConfigAppPath  = "C:\Users\dcocc\Desktop\statdeck\StatDeck\StatDeck\Windows\StatDeck.ConfigApp"
$BackupRoot     = "C:\Users\dcocc\Desktop\statdeck\BACKUPS"
$BackupDir      = Join-Path $BackupRoot "v40-pages-$timestamp"

# ---- NEW FILES (all loose in statdeck folder) ----
$PiAppJs        = Join-Path $ScriptDir "app.js"
$PiPageNavJs    = Join-Path $ScriptDir "page-nav-tile.js"
$AppRendererJs  = Join-Path $ScriptDir "renderer.js"
$AppConfigLoader= Join-Path $ScriptDir "config-loader.js"
$AppPageTabsCss = Join-Path $ScriptDir "page-tabs.css"

# ============================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  StatDeck v4.0 Multi-Page Deploy" -ForegroundColor Cyan
Write-Host "  $timestamp" -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Verify new files exist ----
if (-not $BackupOnly) {
    $requiredFiles = @($PiAppJs, $PiPageNavJs, $AppRendererJs, $AppConfigLoader, $AppPageTabsCss)
    $missing = @()
    foreach ($f in $requiredFiles) {
        if (-not (Test-Path $f)) { $missing += $f }
    }
    if ($missing.Count -gt 0) {
        Write-Host "ERROR: Missing required files:" -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        exit 1
    }
    Write-Host "[OK] All required deploy files found" -ForegroundColor Green
}

# ---- Create backup directory ----
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Write-Host "[OK] Backup directory: $BackupDir" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PHASE 0: FULL PI BACKUP TO LOCAL PC
# ============================================================================

if (-not $SkipPi) {
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host "  PHASE 0: FULL PI BACKUP TO LOCAL PC" -ForegroundColor Magenta
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ""

    $piBackupLocal = Join-Path $BackupDir "pi-full-backup"
    New-Item -ItemType Directory -Path $piBackupLocal -Force | Out-Null

    # ---- Create tar.gz on Pi ----
    Write-Host "[1/3] Creating full backup archive on Pi..." -ForegroundColor Cyan
    Write-Host "  Includes: ~/StatDeck/  ~/.xinitrc  ~/.bash_profile" -ForegroundColor DarkGray

    $tarName = "statdeck-full-backup-$timestamp.tar.gz"
    $tarCmd = 'cd ~; tar -czf ~/' + $tarName + ' --ignore-failed-read StatDeck/ .xinitrc .bash_profile 2>/dev/null; echo TAR_DONE'
    ssh $PiHost $tarCmd

    # Grab systemd service files
    Write-Host "  Grabbing systemd service files..." -ForegroundColor DarkGray
    ssh $PiHost 'sudo cp /etc/systemd/system/statdeck-backend.service ~/statdeck-backend.service 2>/dev/null; sudo cp /etc/systemd/system/statdeck-frontend.service ~/statdeck-frontend.service 2>/dev/null; sudo chmod 644 ~/statdeck-*.service 2>/dev/null; echo SERVICES_COPIED'

    # ---- Download to local PC ----
    Write-Host ""
    Write-Host "[2/3] Downloading to local PC..." -ForegroundColor Cyan

    # Main archive
    $tarLocalPath = Join-Path $piBackupLocal $tarName
    Write-Host "  Downloading archive..." -ForegroundColor DarkGray
    $scpSource = "${PiHost}:~/${tarName}"
    scp $scpSource $tarLocalPath
    if ($LASTEXITCODE -eq 0) {
        $fileSizeMB = [math]::Round((Get-Item $tarLocalPath).Length / 1MB, 1)
        Write-Host ("  -> Archive downloaded: " + $fileSizeMB + " MB") -ForegroundColor Green
    } else {
        Write-Host "  -> WARNING: Archive download failed" -ForegroundColor Yellow
    }

    # Systemd services
    $svcBackend = Join-Path $piBackupLocal "statdeck-backend.service"
    $svcFrontend = Join-Path $piBackupLocal "statdeck-frontend.service"

    scp "${PiHost}:~/statdeck-backend.service" $svcBackend 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "  -> statdeck-backend.service" -ForegroundColor Green }
    else { Write-Host "  -> statdeck-backend.service not found (ok)" -ForegroundColor Yellow }

    scp "${PiHost}:~/statdeck-frontend.service" $svcFrontend 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "  -> statdeck-frontend.service" -ForegroundColor Green }
    else { Write-Host "  -> statdeck-frontend.service not found (ok)" -ForegroundColor Yellow }

    # Current layout.json
    $layoutLocal = Join-Path $piBackupLocal "layout.json"
    scp "${PiHost}:~/StatDeck/backend/config/layout.json" $layoutLocal 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "  -> layout.json" -ForegroundColor Green }
    else { Write-Host "  -> layout.json not found" -ForegroundColor Yellow }

    # ---- On-Pi safety backup ----
    Write-Host ""
    Write-Host "[3/3] Creating safety backup on Pi..." -ForegroundColor Cyan
    $cpCmd = 'cp -r ~/StatDeck ~/StatDeck-pre-pages-' + $timestamp + ' 2>/dev/null; echo PI_BACKUP_DONE'
    ssh $PiHost $cpCmd
    Write-Host "  -> ~/StatDeck-pre-pages-$timestamp" -ForegroundColor Green

    # Clean up temp files on Pi
    $cleanCmd = 'rm -f ~/statdeck-backend.service ~/statdeck-frontend.service ~/' + $tarName + ' 2>/dev/null'
    ssh $PiHost $cleanCmd
    Write-Host "  -> Cleaned temp files on Pi" -ForegroundColor DarkGray

    Write-Host ""
    Write-Host "  PI BACKUP COMPLETE" -ForegroundColor Green
    Write-Host ""
}

# ---- Config App local backup ----
if (-not $SkipApp) {
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host "  CONFIG APP LOCAL BACKUP" -ForegroundColor Magenta
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ""

    $rendererCheck = Join-Path $ConfigAppPath "renderer.js"
    if (-not (Test-Path $rendererCheck)) {
        Write-Host "ERROR: Config App not found at: $ConfigAppPath" -ForegroundColor Red
        exit 1
    }

    $appBackupDir = Join-Path $BackupDir "config-app-backup"
    New-Item -ItemType Directory -Path $appBackupDir -Force | Out-Null

    $filesToBackup = @(
        "renderer.js",
        "main.js",
        "package.json",
        "index.html",
        "styles\app.css",
        "styles\themes.css",
        "styles\theme-builder.css",
        "components\grid-canvas.js",
        "components\properties-panel.js",
        "components\action-editor.js",
        "components\tile-palette.js",
        "components\theme-builder.js",
        "utils\config-loader.js",
        "utils\live-preview-bridge.js",
        "utils\theme-manager.js",
        "utils\usb-manager.js",
        "utils\undo-manager.js",
        "utils\icon-loader.js"
    )

    $backedUp = 0
    foreach ($relPath in $filesToBackup) {
        $srcFile = Join-Path $ConfigAppPath $relPath
        if (Test-Path $srcFile) {
            $destRelDir = Split-Path $relPath -Parent
            if ($destRelDir) {
                $destDirFull = Join-Path $appBackupDir $destRelDir
                New-Item -ItemType Directory -Path $destDirFull -Force | Out-Null
            }
            $destFile = Join-Path $appBackupDir $relPath
            Copy-Item $srcFile $destFile
            $backedUp++
        }
    }

    Write-Host ("  -> " + $backedUp + " Config App files backed up") -ForegroundColor Green
    Write-Host "     $appBackupDir" -ForegroundColor DarkGray
    Write-Host ""
}

# ---- Stop here if backup-only ----
if ($BackupOnly) {
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  BACKUP COMPLETE (deploy skipped)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Everything saved to: $BackupDir" -ForegroundColor White
    Write-Host ""
    exit 0
}

# ============================================================================
# PHASE 1: PI DEPLOY
# ============================================================================

if (-not $SkipPi) {
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host "  PHASE 1: PI DEPLOY" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host ""

    # ---- Stop Chromium ----
    Write-Host "[1/3] Stopping Chromium..." -ForegroundColor Cyan
    ssh $PiHost 'sudo pkill -9 chromium 2>/dev/null; sleep 1; echo stopped'
    Write-Host "  -> Chromium stopped" -ForegroundColor Green

    # ---- SCP new files ----
    Write-Host ""
    Write-Host "[2/3] Deploying files..." -ForegroundColor Cyan

    $piAppDest = "${PiHost}:${PiPath}/frontend/core/app.js"
    scp $PiAppJs $piAppDest
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: SCP app.js failed! Restoring..." -ForegroundColor Red
        $restoreCmd = 'cp ~/StatDeck-pre-pages-' + $timestamp + '/frontend/core/app.js ~/StatDeck/frontend/core/app.js'
        ssh $PiHost $restoreCmd
        exit 1
    }
    Write-Host "  -> core/app.js" -ForegroundColor Green

    $piNavDest = "${PiHost}:${PiPath}/frontend/tiles/page-nav-tile.js"
    scp $PiPageNavJs $piNavDest
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: SCP page-nav-tile.js failed! Restoring..." -ForegroundColor Red
        $restoreCmd = 'cp ~/StatDeck-pre-pages-' + $timestamp + '/frontend/tiles/page-nav-tile.js ~/StatDeck/frontend/tiles/page-nav-tile.js'
        ssh $PiHost $restoreCmd
        exit 1
    }
    Write-Host "  -> tiles/page-nav-tile.js" -ForegroundColor Green

    # ---- Clear cache ----
    Write-Host ""
    Write-Host "[3/3] Clearing Chromium cache..." -ForegroundColor Cyan
    ssh $PiHost 'rm -rf ~/.cache/chromium 2>/dev/null; rm -rf ~/.config/chromium/Default/Cache 2>/dev/null; echo done'
    Write-Host "  -> Cache cleared. Chromium restarting via xinitrc." -ForegroundColor Green

    Write-Host ""
    Write-Host "  PI DEPLOY COMPLETE" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# PHASE 2: CONFIG APP DEPLOY
# ============================================================================

if (-not $SkipApp) {
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host "  PHASE 2: CONFIG APP DEPLOY" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host ""

    # ---- renderer.js ----
    Write-Host "[1/4] Replacing renderer.js..." -ForegroundColor Cyan
    $destRenderer = Join-Path $ConfigAppPath "renderer.js"
    Copy-Item $AppRendererJs $destRenderer -Force
    Write-Host "  -> renderer.js" -ForegroundColor Green

    # ---- config-loader.js ----
    Write-Host ""
    Write-Host "[2/4] Replacing config-loader.js..." -ForegroundColor Cyan
    $destConfigLoader = Join-Path $ConfigAppPath "utils\config-loader.js"
    Copy-Item $AppConfigLoader $destConfigLoader -Force
    Write-Host "  -> utils/config-loader.js" -ForegroundColor Green

    # ---- index.html (insert page-tab-bar) ----
    Write-Host ""
    Write-Host "[3/4] Patching index.html..." -ForegroundColor Cyan
    $indexPath = Join-Path $ConfigAppPath "index.html"
    $indexContent = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)

    if ($indexContent.Contains('id="page-tab-bar"')) {
        Write-Host "  -> page-tab-bar already present, skipping" -ForegroundColor Yellow
    } else {
        $insertBlock = "`r`n        <!-- Page Tab Bar (v4.0 Multi-Page) -->`r`n        <div id=`"page-tab-bar`">`r`n            <!-- Tabs rendered dynamically by renderer.js -->`r`n        </div>`r`n`r`n        "
        $searchStr = '        <div id="main-content">'
        $replaceStr = $insertBlock + '<div id="main-content">'
        $indexContent = $indexContent.Replace($searchStr, $replaceStr)
        [System.IO.File]::WriteAllText($indexPath, $indexContent, [System.Text.Encoding]::UTF8)
        Write-Host "  -> page-tab-bar inserted" -ForegroundColor Green
    }

    # ---- app.css (append page-tab CSS) ----
    Write-Host ""
    Write-Host "[4/4] Appending page-tab CSS..." -ForegroundColor Cyan
    $cssPath = Join-Path $ConfigAppPath "styles\app.css"
    $appCssContent = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)

    if ($appCssContent.Contains('PAGE TAB BAR')) {
        Write-Host "  -> Page tab CSS already present, skipping" -ForegroundColor Yellow
    } else {
        $tabCssContent = [System.IO.File]::ReadAllText($AppPageTabsCss, [System.Text.Encoding]::UTF8)
        $newCss = $appCssContent + "`r`n`r`n" + $tabCssContent
        [System.IO.File]::WriteAllText($cssPath, $newCss, [System.Text.Encoding]::UTF8)
        Write-Host "  -> Page tab CSS appended" -ForegroundColor Green
    }

    # ---- grid-canvas.js (loadPage + tile push fix) ----
    Write-Host ""
    Write-Host "[BONUS] Patching grid-canvas.js..." -ForegroundColor Cyan
    $gcPath = Join-Path $ConfigAppPath "components\grid-canvas.js"
    $gcContent = [System.IO.File]::ReadAllText($gcPath, [System.Text.Encoding]::UTF8)
    $gcChanged = $false

    if ($gcContent.Contains('loadPage(')) {
        Write-Host "  -> loadPage() already exists" -ForegroundColor Yellow
    } else {
        $loadPageMethod = @'

    /**
     * Load a single page into the canvas (v4.0).
     * @param {Object} page - { id, name, grid, tiles }
     */
    loadPage(page) {
        const layout = {
            grid: page.grid,
            tiles: page.tiles
        };
        this.loadLayout(layout);
    }

'@
        $gcContent = $gcContent.Replace('    loadLayout(', ($loadPageMethod + "    loadLayout("))
        $gcChanged = $true
        Write-Host "  -> loadPage() added" -ForegroundColor Green
    }

    if ($gcContent.Contains('this.app.layout.tiles.push(tileConfig)')) {
        $gcContent = $gcContent.Replace(
            'this.app.layout.tiles.push(tileConfig)',
            'this.app.getCurrentPage().tiles.push(tileConfig)'
        )
        $gcChanged = $true
        Write-Host "  -> Tile push target fixed" -ForegroundColor Green
    } else {
        Write-Host "  -> Tile push already correct" -ForegroundColor Yellow
    }

    if ($gcChanged) {
        [System.IO.File]::WriteAllText($gcPath, $gcContent, [System.Text.Encoding]::UTF8)
    }

    Write-Host ""
    Write-Host "  CONFIG APP DEPLOY COMPLETE" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ALL DONE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  BACKUP LOCATION:" -ForegroundColor White
Write-Host "    $BackupDir" -ForegroundColor DarkGray
Write-Host ""

if (-not $SkipPi) {
    Write-Host "  Pi backup (local):" -ForegroundColor White
    Write-Host "    pi-full-backup\ has full tar.gz + layout.json + systemd services" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Pi backup (on device):" -ForegroundColor White
    Write-Host "    ~/StatDeck-pre-pages-$timestamp" -ForegroundColor DarkGray
    Write-Host ""
}

if (-not $SkipApp) {
    Write-Host "  Config App backup:" -ForegroundColor White
    Write-Host "    config-app-backup\ has all JS, HTML, CSS files" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Host "  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "    1. Restart the Config App" -ForegroundColor White
Write-Host "    2. Verify Page 1 tab appears below the toolbar" -ForegroundColor White
Write-Host "    3. Click + to add Page 2" -ForegroundColor White
Write-Host "    4. Add page_prev/page_next tiles to each page" -ForegroundColor White
Write-Host "    5. Push to Pi and tap arrows to switch pages" -ForegroundColor White
Write-Host ""
Write-Host "  ROLLBACK:" -ForegroundColor Yellow
$rollbackCmd = "    Pi:  ssh " + $PiHost + " 'cp -r ~/StatDeck-pre-pages-" + $timestamp + "/* ~/StatDeck/'"
Write-Host $rollbackCmd -ForegroundColor DarkGray
Write-Host "    App: Copy from config-app-backup\ back to ConfigApp folder" -ForegroundColor DarkGray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
