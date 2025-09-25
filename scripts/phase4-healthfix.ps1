# C:\JetSetNew6\scripts\phase4-healthfix.ps1
param([string]$ProjectRoot = "C:\JetSetNew6")

$ErrorActionPreference = "Stop"
function Log([string]$m){ Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $m" }

Set-Location $ProjectRoot
Log "Root: $ProjectRoot"

# Paths
$oldPath = Join-Path $ProjectRoot "app\api\_health\auth\route.ts"
$newDir  = Join-Path $ProjectRoot "app\api\health\auth"
$newPath = Join-Path $newDir "route.ts"

if (Test-Path $oldPath) {
  New-Item -ItemType Directory -Force -Path $newDir | Out-Null
  Copy-Item -LiteralPath $oldPath -Destination $newPath -Force
  Remove-Item -LiteralPath $oldPath -Force
  Log "Moved route: _health → health"
} else {
  Log "No _health route found, skipping"
}

# Git commit + push
git add .
git commit -m "Hotfix: move _health route to health for Vercel API visibility" | Out-Null
git push origin main | Out-Host
Log "✅ Hotfix pushed. Vercel will redeploy automatically."

Log "After deploy, test: https://jetsetdirect.com/api/health/auth"
