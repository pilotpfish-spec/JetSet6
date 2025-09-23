# Audit-JetSet6.ps1
# Generates a plain-text audit of files: touched, junk, core.
# No edits are made. Report only.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath "C:\JetSetNew6"

# Output file
$report = "C:\JetSetNew6\audit-report.txt"
if (Test-Path $report) { Remove-Item $report -Force }

# Buckets
$touched = @()
$junk    = @()
$core    = @()

# Known touched markers
$touchedPatterns = @(
    '\.bak-\d{8}_\d{6}$',
    '\.broken-\d{8}_\d{6}$',
    'Quick-Deploy-Fix\.ps1',
    'Fix-Injected-Files\.ps1'
)

# Known junk (starter repo leftovers)
$junkPaths = @(
    'app\\\(marketing\)',
    'app\\\(protected\)\\admin',
    'app\\\(protected\)\\dashboard',
    'app\\\(marketing\)\\pricing',
    'app\\testimonials',
    'app\\reviews'
)

# Core files we care about
$corePaths = @(
    'app\\booking\\page.tsx',
    'app\\quote\\page.tsx',
    'app\\page.tsx',
    'app\\layout.tsx',
    'lib\\fareCalculator.ts',
    'lib\\quoteService.ts',
    'lib\\session.ts',
    'auth.ts'
)

# Crawl project
Get-ChildItem -Recurse -File | ForEach-Object {
    $path = $_.FullName

    if ($touchedPatterns | Where-Object { $path -match $_ }) {
        $touched += $path
    }
    elseif ($junkPaths | Where-Object { $path -match $_ }) {
        $junk += $path
    }
    elseif ($corePaths | Where-Object { $path -like "*$_" }) {
        $core += $path
    }
}

# Write report
Add-Content $report "`n=== AUDIT REPORT for JetSet6 ===`n"

Add-Content $report "`n--- TOUCHED FILES (check carefully) ---"
if ($touched.Count -eq 0) {
    Add-Content $report "  (none found)"
} else {
    $touched | ForEach-Object { Add-Content $report "  $_" }
}

Add-Content $report "`n--- JUNK/RESIDUAL FILES (likely safe to delete later) ---"
if ($junk.Count -eq 0) {
    Add-Content $report "  (none found)"
} else {
    $junk | ForEach-Object { Add-Content $report "  $_" }
}

Add-Content $report "`n--- CORE PROJECT FILES (protect these) ---"
$core | ForEach-Object { Add-Content $report "  $_" }

Add-Content $report "`n=== END OF REPORT ===`n"

Write-Host "✅ Audit complete. See $report"
