<# 
.SYNOPSIS
  Deploy Sanity Check & Safe Auto-Fixes for JetSet project (Next.js + NextAuth v4 + Stripe)

.DESCRIPTION
  - Creates timestamped backups for anything it touches
  - Switches to a temporary safety branch
  - Validates NextAuth v4 wiring, TypeScript session typings, lockfile consistency
  - Repairs common issues we’ve seen:
      * PowerShell script text accidentally injected into TS files (esp. actions/generate-user-stripe.ts)
      * Missing next-auth.d.ts and tsconfig include
      * Wrong import path for getServerSession in generate-user-stripe.ts
  - Runs local production build and captures logs
  - Optionally deploys to Vercel if build succeeds

.PARAMETER ApplyFixes
  Apply the safe, surgical fixes and commit them to a temp branch. Without this flag, the script reports only.

.PARAMETER AutoDeploy
  If set, and local build passes, runs `vercel --prod --yes`. Requires the project to be already linked.

.EXAMPLE
  pwsh -File .\tools\Deploy-Sanity.ps1

.EXAMPLE
  pwsh -File .\tools\Deploy-Sanity.ps1 -ApplyFixes

.EXAMPLE
  pwsh -File .\tools\Deploy-Sanity.ps1 -ApplyFixes -AutoDeploy
#>

param(
  [switch]$ApplyFixes,
  [switch]$AutoDeploy
)

# ---------- Setup ----------
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Set-Location ..  # ensure root is project root (tools\ is inside project)
$projectRoot = Get-Location

Write-Host "Project Root:" $projectRoot

# Paths
$SanityDir = Join-Path $projectRoot "sanity-output"
$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupDir = Join-Path $projectRoot ("sanity-backup-" + $ts)

# Files we may adjust/inspect
$PkgJson = Join-Path $projectRoot "package.json"
$TsConfig = Join-Path $projectRoot "tsconfig.json"
$NextAuthDts = Join-Path $projectRoot "next-auth.d.ts"
$StripeAction = Join-Path $projectRoot "actions\generate-user-stripe.ts"
$Lockfile = Join-Path $projectRoot "pnpm-lock.yaml"

# Helpers
function Section($title) {
  Write-Host ""
  Write-Host "=== $title ===" -ForegroundColor Cyan
}
function Info($msg) {
  Write-Host "• $msg" -ForegroundColor Gray
}
function Ok($msg) {
  Write-Host "✔ $msg" -ForegroundColor Green
}
function Warn($msg) {
  Write-Host "! $msg" -ForegroundColor Yellow
}
function Err($msg) {
  Write-Host "✖ $msg" -ForegroundColor Red
}

# Ensure output dirs
New-Item -ItemType Directory -Force -Path $SanityDir | Out-Null
if ($ApplyFixes) {
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

# ---------- 0) Git safety branch ----------
Section "Git: safety branch"
try {
  $branchName = "deploy-sanity-" + (Get-Date).ToString("yyyyMMdd-HHmmss")
  $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
  Info "Current branch: $currentBranch"
  if ($ApplyFixes) {
    Info "Creating and switching to temp branch: $branchName"
    git checkout -b $branchName | Out-Null
    Ok "On branch $branchName"
  } else {
    Info "Read-only mode: staying on $currentBranch"
  }
} catch {
  Err "Git not available or repo not initialized."
}

# ---------- 1) Quick environment checks ----------
Section "Environment checks"
# pnpm
try {
  $pnpmVersion = (pnpm --version).Trim()
  Ok "pnpm detected: v$pnpmVersion"
} catch { Err "pnpm not found. Please install pnpm." }

# vercel
try {
  $vercelVersion = (vercel --version).Trim()
  Ok "Vercel CLI detected: v$vercelVersion"
} catch { Warn "Vercel CLI not found. AutoDeploy will be skipped." ; $AutoDeploy = $false }

# Node
try {
  $nodeVersion = (node -v).Trim()
  Ok "Node detected: $nodeVersion"
} catch { Err "Node not found." }

# ---------- 2) Package & NextAuth version ----------
Section "NextAuth & package.json"
if (Test-Path $PkgJson) {
  $pkg = Get-Content $PkgJson -Raw | ConvertFrom-Json
  $dep = $pkg.dependencies.'next-auth'
  if ($dep -match '^4') {
    Ok "next-auth dependency is v4 ($dep)"
  } else {
    Err "next-auth version is not v4. Found: $dep"
  }
} else {
  Err "package.json not found"
}

# ---------- 3) Ensure next-auth.d.ts typings ----------
Section "Session typings (next-auth.d.ts)"
$expectedDts = @'
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
'@

$needWriteDts = $false
if (-not (Test-Path $NextAuthDts)) {
  Warn "next-auth.d.ts is missing"
  $needWriteDts = $true
} else {
  $current = Get-Content $NextAuthDts -Raw
  if ($current -notmatch "interface\s+Session" -or $current -notmatch "interface\s+JWT") {
    Warn "next-auth.d.ts exists but does not contain expected Session/JWT typings"
    $needWriteDts = $true
  } else {
    Ok "next-auth.d.ts looks good"
  }
}

if ($needWriteDts) {
  if ($ApplyFixes) {
    Copy-Item $NextAuthDts (Join-Path $BackupDir "next-auth.d.ts") -ErrorAction SilentlyContinue
    $expectedDts | Set-Content -LiteralPath $NextAuthDts -Encoding UTF8
    Ok "Wrote next-auth.d.ts with v4 Session/JWT typings"
  } else {
    Warn "Run with -ApplyFixes to write next-auth.d.ts"
  }
}

# ---------- 4) Ensure tsconfig includes next-auth.d.ts ----------
Section "tsconfig includes"
if (Test-Path $TsConfig) {
  try {
    $tsJson = Get-Content $TsConfig -Raw | ConvertFrom-Json
    $include = @()
    if ($tsJson.include) { $include = [System.Collections.ArrayList]$tsJson.include } 
    else { $tsJson | Add-Member -Name include -Value @() -MemberType NoteProperty ; $include = [System.Collections.ArrayList]$tsJson.include }

    if ($include -notcontains "next-auth.d.ts") {
      Warn "tsconfig.json include missing next-auth.d.ts"
      if ($ApplyFixes) {
        Copy-Item $TsConfig (Join-Path $BackupDir "tsconfig.json") -Force
        $include.Add("next-auth.d.ts") | Out-Null
        ($tsJson | ConvertTo-Json -Depth 100) | Set-Content -LiteralPath $TsConfig -Encoding UTF8
        Ok "Added next-auth.d.ts to tsconfig include"
      } else {
        Warn "Run with -ApplyFixes to add next-auth.d.ts to tsconfig"
      }
    } else {
      Ok "tsconfig includes next-auth.d.ts"
    }
  } catch {
    Err "Failed to parse tsconfig.json"
  }
} else {
  Err "tsconfig.json not found"
}

# ---------- 5) Sanitize accidental PowerShell text in TS/TSX ----------
Section "Sanitize potential PowerShell injections in TS/TSX"
function Test-And-Clean-PowerShellInjection($path) {
  if (-not (Test-Path $path)) { return $false }
  $lines = Get-Content $path
  if ($lines.Count -eq 0) { return $false }

  # Detect if the first few lines look like PowerShell or hash comments
  $looksBad = $false
  for ($i=0; $i -lt [Math]::Min(5, $lines.Count); $i++) {
    $l = $lines[$i]
    if ($l -match '^\s*#\s' -or $l -match '^\s*PS\s' -or $l -match '^\s*Copy-Item\s' -or $l -match '^\s*Set-Content\s') {
      $looksBad = $true ; break
    }
  }

  if ($looksBad) {
    Warn "Detected injected script content in $path"
    if ($ApplyFixes) {
      $backupTarget = Join-Path $BackupDir ($path.Substring($projectRoot.Path.Length+1))
      New-Item -ItemType Directory -Force -Path (Split-Path $backupTarget) | Out-Null
      Copy-Item $path $backupTarget -Force

      # Clean by dropping leading non-TS lines until we hit a TS/ESM directive/import/export
      $startIdx = 0
      for ($i=0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*"use server";' -or
            $lines[$i] -match '^\s*import\s' -or
            $lines[$i] -match '^\s*export\s') {
          $startIdx = $i
          break
        }
      }
      $cleaned = $lines[$startIdx..($lines.Count-1)]
      $cleaned | Set-Content -LiteralPath $path -Encoding UTF8
      Ok "Cleaned leading non-TS lines in $path"
      return $true
    } else {
      Warn "Run with -ApplyFixes to clean $path"
    }
  }
  return $false
}

$changedAny = $false
# Target the known hotspot first
if (Test-And-Clean-PowerShellInjection $StripeAction) { $changedAny = $true }

# ---------- 6) Ensure correct import for getServerSession in actions/generate-user-stripe.ts ----------
Section "Stripe action: getServerSession import"
if (Test-Path $StripeAction) {
  $src = Get-Content $StripeAction -Raw
  $needsImportFix = $false

  # Must import from "next-auth/next" in a TS server file context
  if ($src -match 'getServerSession' -and $src -match 'from\s+"next-auth";') {
    $needsImportFix = $true
  }

  if ($needsImportFix) {
    Warn "getServerSession imported from 'next-auth' instead of 'next-auth/next'"
    if ($ApplyFixes) {
      Copy-Item $StripeAction (Join-Path $BackupDir "actions_generate-user-stripe.ts") -Force
      $patched = $src -replace 'from\s+"next-auth";', 'from "next-auth/next";'
      $patched | Set-Content -LiteralPath $StripeAction -Encoding UTF8
      Ok "Patched import to 'next-auth/next' in generate-user-stripe.ts"
      $changedAny = $true
    } else {
      Warn "Run with -ApplyFixes to patch import"
    }
  } else {
    Ok "getServerSession import looks OK (or not used)"
  }
} else {
  Warn "actions/generate-user-stripe.ts not found"
}

# ---------- 7) Lockfile / install consistency ----------
Section "Lockfile & install"
try {
  if ($ApplyFixes) {
    if (Test-Path $Lockfile) { Copy-Item $Lockfile (Join-Path $BackupDir "pnpm-lock.yaml") -Force }
    Info "Running: pnpm install --no-frozen-lockfile"
    pnpm install --no-frozen-lockfile | Tee-Object -FilePath (Join-Path $SanityDir "pnpm-install.log")
    Ok "Dependencies installed"
  } else {
    Info "Dry run: skipping pnpm install"
  }
} catch {
  Err "pnpm install failed"
}

# ---------- 8) TypeScript build (local prod build) ----------
Section "Local production build"
$buildLog = Join-Path $SanityDir "build.log"
$buildPassed = $false
try {
  pnpm run build 2>&1 | Tee-Object -FilePath $buildLog
  # If Next exits non-zero, PowerShell will throw; so we only mark OK if we got here and the log contains no 'Failed to compile.'
  $logText = Get-Content $buildLog -Raw
  if ($LASTEXITCODE -eq 0 -and $logText -notmatch "Failed to compile") {
    Ok "Local build succeeded"
    $buildPassed = $true
  } else {
    Err "Local build reported errors. See $buildLog"
  }
} catch {
  Err "Build command errored. See $buildLog"
}

# ---------- 9) Commit changes if any ----------
Section "Commit changes (temp branch)"
try {
  if ($ApplyFixes) {
    git add . | Out-Null
    if ((git status --porcelain).Trim().Length -gt 0) {
      git commit -m "deploy-sanity($ts): safe fixes (typings, stripe action import, lockfile, sanitize TS)" | Out-Null
      Ok "Committed safe changes on temp branch"
    } else {
      Info "No changes to commit"
    }
  } else {
    Info "Dry run: no commits made"
  }
} catch {
  Err "Git commit failed"
}

# ---------- 10) Optional deploy ----------
Section "Optional Vercel deploy"
if ($AutoDeploy -and $buildPassed) {
  try {
    vercel --prod --yes 2>&1 | Tee-Object -FilePath (Join-Path $SanityDir "vercel-deploy.log")
    if ($LASTEXITCODE -eq 0) {
      Ok "Vercel deploy initiated. See sanity-output\vercel-deploy.log"
    } else {
      Err "Vercel deploy failed. See sanity-output\vercel-deploy.log"
    }
  } catch {
    Err "Vercel CLI error. See sanity-output\vercel-deploy.log"
  }
} elseif ($AutoDeploy -and -not $buildPassed) {
  Warn "Skipping deploy because local build failed."
} else {
  Info "AutoDeploy not requested. Review $buildLog, then deploy manually if ready."
}

# ---------- 11) Summary ----------
Section "Summary"
if ($buildPassed) { Ok "READY: Local build OK." } else { Err "NOT READY: Local build failed. See sanity-output\build.log" }
if ($ApplyFixes) { Ok "Backups at: $BackupDir" } else { Info "No files changed (dry run)." }

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
if ($buildPassed) {
  Write-Host "  • If you DID NOT use -AutoDeploy: run  vercel --prod --yes" -ForegroundColor Gray
} else {
  Write-Host "  • Open sanity-output\\build.log and fix the first error at the top." -ForegroundColor Gray
  Write-Host "  • Re-run this script with -ApplyFixes when you’re ready." -ForegroundColor Gray
}
