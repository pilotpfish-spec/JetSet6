param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$stateDir = Join-Path $root "docs\state"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$outFile = Join-Path $stateDir "snapshot-$timestamp.txt"
function W($line){ $line | Tee-Object -FilePath $outFile -Append | Out-Null }
function Section($t){ W(""); W("=== $t ===") }

W("JetSet6 State Snapshot $timestamp")
W("Root: $root")

Section "Git"
try {
  $branch = git rev-parse --abbrev-ref HEAD 2>$null
  W("Branch: $branch")
  $last = git log -1 --pretty=format:"%h %ci %s" 2>$null
  W("Last commit: $last")
} catch { W("Git info unavailable") }

Section "Key Files"
$paths = @(
 "app\api\auth\[...nextauth]\route.ts",
 "app\providers.tsx",
 "lib\auth.ts",
 "lib\stripe.ts",
 "lib\prisma.ts",
 "lib\fareCalculator.ts",
 "lib\quoteService.ts",
 "app\quote\page.tsx",
 "app\booking\page.tsx",
 "app\account\page.tsx",
 "app\admin\page.tsx",
 "prisma\schema.prisma",
 "next.config.js",
 "package.json"
)
foreach($p in $paths){
  $exists = Test-Path (Join-Path $root $p)
  W(("{0} {1}" -f ($exists ? "[FOUND]" : "[MISS]"), $p))
}

Section "Prisma Schema Checks"
$schema = Join-Path $root "prisma\schema.prisma"
if (Test-Path $schema) {
  try {
    pushd $root | Out-Null
    $validate = npx --yes prisma validate 2>&1
    W("prisma validate: $validate")
    popd | Out-Null
  } catch { W("prisma validate error: $_") }
  $content = Get-Content $schema -Raw
  foreach($kw in @("model Booking","BookingStatus","stripeCustomerId","scheduledAt","pickup","dropoff","priceCents","status")){
    $has = $content -match [regex]::Escape($kw)
    W(("{0} {1}" -f ($has ? "[HAS]" : "[NO]"), $kw))
  }
} else {
  W("schema.prisma not found")
}

Section "HTTP Probes"
function Probe($path) {
  $url = "$BaseUrl$path"
  try {
    $resp = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 6
    W("GET $path -> $($resp.StatusCode)")
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    W("GET $path -> ERROR $code $($_.Exception.Message)")
  }
}
Probe "/api/auth"
Probe "/api/stripe/checkout"
Probe "/api/stripe/webhook"
Probe "/account"
Probe "/admin"

W("")
W("Saved: $outFile")
Write-Output "Snapshot written to $outFile"
