# ============================================================
#  JOURNEWS — Deploy Builder for Hostinger Node.js Web App
#  Usage:  Right-click -> "Run with PowerShell"
#          OR in terminal: powershell -ExecutionPolicy Bypass -File deploy.ps1
# ============================================================

param(
    [string]$OutputName = "journews-hostinger-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

$ErrorActionPreference = "Stop"
$ProjectDir  = $PSScriptRoot
$OutZip      = Join-Path $ProjectDir "$OutputName.zip"
$TempDir     = Join-Path $env:TEMP "journews-deploy-$(Get-Random)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   JOURNEWS Deploy Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project : $ProjectDir"
Write-Host "Output  : $OutZip"
Write-Host ""

# ── Step 1: Build ────────────────────────────────────────────
Write-Host "[1/3] Building Next.js..." -ForegroundColor Yellow
Set-Location $ProjectDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Fix errors above and try again." -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Build OK" -ForegroundColor Green
Write-Host ""

# ── Step 2: Prepare temp folder ──────────────────────────────
Write-Host "[2/3] Assembling deploy package..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TempDir | Out-Null

$Items = @(
    ".next-build",     # renamed to .next below
    "public",
    "prisma",
    "scripts",
    "types",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "next-env.d.ts",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.js",
    "components.json"
)

foreach ($item in $Items) {
    $src = Join-Path $ProjectDir $item
    $dst = Join-Path $TempDir $item
    if (Test-Path $src) {
        if ((Get-Item $src).PSIsContainer) {
            Copy-Item -Path $src -Destination $dst -Recurse -Force
        } else {
            Copy-Item -Path $src -Destination $dst -Force
        }
        Write-Host "  + $item" -ForegroundColor Gray
    } else {
        Write-Host "  - $item (skipped, not found)" -ForegroundColor DarkGray
    }
}

# Rename .next-build -> .next  (Linux/Hostinger expects .next)
$buildPath = Join-Path $TempDir ".next-build"
if (Test-Path $buildPath) {
    Rename-Item -Path $buildPath -NewName ".next"
    Write-Host "  Renamed .next-build -> .next" -ForegroundColor Gray
}

Write-Host ""

# ── Step 3: Zip ──────────────────────────────────────────────
Write-Host "[3/3] Creating zip archive..." -ForegroundColor Yellow
if (Test-Path $OutZip) { Remove-Item $OutZip -Force }

Compress-Archive -Path "$TempDir\*" -DestinationPath $OutZip -Force
Remove-Item -Path $TempDir -Recurse -Force

$sizeMB = [Math]::Round((Get-Item $OutZip).Length / 1MB, 1)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   DONE!  $sizeMB MB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "File: $OutZip"
Write-Host ""
Write-Host "NEXT STEPS on Hostinger:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Upload the zip to Node.js Web App"
Write-Host ""
Write-Host "  2. Set Environment Variables in Hostinger panel:"
Write-Host "       NODE_ENV        = production"
Write-Host "       DATABASE_URL    = postgresql://user:pass@host:5432/dbname"
Write-Host "       NEXTAUTH_URL    = https://yourdomain.com"
Write-Host "       NEXTAUTH_SECRET = (random 32+ chars)"
Write-Host ""
Write-Host "  3. Startup command:  npm start"
Write-Host ""
Write-Host "  4. Build command in Hostinger: npm run build"
Write-Host "     (Prisma migrate deploy is already included in build)"
Write-Host ""

pause