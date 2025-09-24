# tools/Fix-QuotePage.ps1
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Good($m){ Write-Host $m -ForegroundColor Green }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }

$repo = Get-Location
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$quoteDir = Join-Path $repo.Path "app\quote"
$pagePath = Join-Path $quoteDir "page.tsx"
$innerPath = Join-Path $quoteDir "_pageInner.tsx"

if (-not (Test-Path -LiteralPath $pagePath)) {
  Warn "Could not find app/quote/page.tsx. Nothing changed."
  exit 1
}

# 1) Backup original page.tsx and move to _pageInner.tsx (only if inner not yet created)
Copy-Item -LiteralPath $pagePath -Destination ($pagePath + ".bak-$ts") -Force
if (-not (Test-Path -LiteralPath $innerPath)) {
  Move-Item -LiteralPath $pagePath -Destination $innerPath -Force
  Info "Renamed page.tsx -> _pageInner.tsx"
} else {
  Info "_pageInner.tsx already exists; leaving it as-is"
}

# 2) If _pageInner.tsx uses useSearchParams but is not a client component, add 'use client'
$inner = [IO.File]::ReadAllText($innerPath)
if ($inner -match 'useSearchParams\s*\(' -and ($inner -notmatch '^\s*["'']use client["''];' -and $inner -notmatch '^\s*[''"]use client[''"];')) {
  $inner = "'use client';`n" + $inner
  [IO.File]::WriteAllText($innerPath, ($inner -split "`r?`n") -join "`n", (New-Object System.Text.UTF8Encoding($false)))
  Info "Inserted 'use client' into _pageInner.tsx (uses useSearchParams)"
}

# 3) Write wrapper page.tsx that adds Suspense and forces dynamic rendering
$wrapper = @'
import { Suspense } from "react";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Re-export metadata if the inner file defines it (safe even if not present)
export { metadata, generateMetadata } from "./_pageInner";

import PageInner from "./_pageInner";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}
'@

[IO.File]::WriteAllText(
  $pagePath,
  (($wrapper -split "`r?`n") -join "`n"),
  (New-Object System.Text.UTF8Encoding($false))
)

Good "✅ Wrapped /quote in Suspense and set dynamic SSR. Layout/design unchanged."
Info  "   - app/quote/page.tsx -> wrapper"
Info  "   - app/quote/_pageInner.tsx -> your original content"

