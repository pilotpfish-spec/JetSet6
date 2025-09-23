<#
.SYNOPSIS
  Quick Deploy Fix script for JetSet6 project

.DESCRIPTION
  Runs sanity checks, applies targeted fixes for known NextAuth v4 + Stripe issues,
  and attempts a deploy via Vercel. Designed to avoid destructive changes.

.PARAMETER ApplyFixes
  If set, fixes are applied. Otherwise, just reports issues.

.PARAMETER Deploy
  If set, deploys via Vercel after fixes.
#>

param(
  [switch]$ApplyFixes,
  [switch]$Deploy
)

$ProjectRoot = "C:\JetSetNew6"
Set-Location -LiteralPath $ProjectRoot

# Utility functions
function Write-Section { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "✔ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "✖ $msg" -ForegroundColor Red }

function Backup-IfExists($file) {
  if (Test-Path $file) {
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $backup = "$file.bak-$ts"
    Copy-Item $file $backup
    Write-Warn "Backup created: $backup"
  }
}

$Changed = @()

# Step 1: Env sanity
Write-Section "Environment sanity"
$pnpm = (pnpm --version) 2>$null
if ($LASTEXITCODE -eq 0) { Write-OK "pnpm detected: $pnpm" } else { Write-Err "pnpm missing"; exit 1 }
$vercel = (vercel --version) 2>$null
if ($LASTEXITCODE -eq 0) { Write-OK "Vercel CLI detected: $vercel" } else { Write-Err "Vercel CLI missing"; exit 1 }

# Step 2: package.json check
Write-Section "Checking package.json for NextAuth"
$pkgPath = Join-Path $ProjectRoot "package.json"
$pkg = Get-Content $pkgPath | ConvertFrom-Json
if ($pkg.dependencies."next-auth" -match "5\.0\.0") {
  Write-Warn "next-auth v5 detected"
  if ($ApplyFixes) {
    $pkg.dependencies."next-auth" = "^4.24.11"
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath -Encoding UTF8
    $Changed += $pkgPath
    Write-OK "Rewrote next-auth dependency to ^4.24.11"
    pnpm install --no-frozen-lockfile
  }
} else {
  Write-OK "next-auth version already v4"
}

# Step 3: next-auth.d.ts presence
Write-Section "Checking next-auth.d.ts"
$declFile = Join-Path $ProjectRoot "next-auth.d.ts"
if (-not (Test-Path $declFile)) {
  Write-Warn "next-auth.d.ts missing"
  if ($ApplyFixes) {
    @'
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
'@ | Set-Content $declFile -Encoding UTF8
    $Changed += $declFile
    Write-OK "Created next-auth.d.ts"
  }
} else {
  Write-OK "next-auth.d.ts present"
}

# Step 4: tsconfig includes
Write-Section "Checking tsconfig.json includes"
$tsconfigPath = Join-Path $ProjectRoot "tsconfig.json"
$ts = Get-Content $tsconfigPath | ConvertFrom-Json
if ($ts.include -notcontains "next-auth.d.ts") {
  Write-Warn "tsconfig.json missing next-auth.d.ts"
  if ($ApplyFixes) {
    $ts.include += "next-auth.d.ts"
    $ts | ConvertTo-Json -Depth 5 | Set-Content $tsconfigPath -Encoding UTF8
    $Changed += $tsconfigPath
    Write-OK "Updated tsconfig.json include"
  }
} else {
  Write-OK "tsconfig.json already includes next-auth.d.ts"
}

# Step 5: generate-user-stripe.ts clean
Write-Section "Fixing generate-user-stripe.ts"
$stripePath = Join-Path $ProjectRoot "actions\generate-user-stripe.ts"
if (Test-Path $stripePath) {
  $orig = Get-Content $stripePath -Raw
  if ($orig -match "# Location:" -or $orig -match "\$file =") {
    Write-Warn "generate-user-stripe.ts contains stray PowerShell lines"
    if ($ApplyFixes) {
      Backup-IfExists $stripePath
      @'
"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { absoluteUrl } from "@/lib/utils";
import { redirect } from "next/navigation";

export type responseAction = {
  status: "success" | "error";
  stripeUrl?: string;
};

const billingUrl = absoluteUrl("/pricing");

export async function generateUserStripe(priceId: string): Promise<responseAction> {
  let redirectUrl: string = "";

  try {
    const session = await getServerSession(authOptions);
    const user = (session?.user ?? null) as (null | { id?: string; email?: string | null });

    if (!user?.id || !user?.email) {
      throw new Error("Unauthorized");
    }

    const subscriptionPlan = await getUserSubscriptionPlan(user.id);

    if (subscriptionPlan.isPaid && subscriptionPlan.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: subscriptionPlan.stripeCustomerId,
        return_url: billingUrl,
      });
      redirectUrl = stripeSession.url as string;
    } else {
      const stripeSession = await stripe.checkout.sessions.create({
        success_url: billingUrl,
        cancel_url: billingUrl,
        payment_method_types: ["card"],
        mode: "subscription",
        billing_address_collection: "auto",
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { userId: user.id },
      });
      redirectUrl = stripeSession.url as string;
    }
  } catch (error) {
    throw new Error("Failed to generate user stripe session");
  }

  redirect(redirectUrl);
}
'@ | Set-Content $stripePath -Encoding UTF8
      $Changed += $stripePath
      Write-OK "generate-user-stripe.ts restored clean"
    }
  } else {
    Write-OK "generate-user-stripe.ts looks OK"
  }
} else {
  Write-OK "generate-user-stripe.ts not found"
}

# Step 6: app/api/user/route.ts
Write-Section "Fixing app/api/user/route.ts"
$userApiPath = Join-Path $ProjectRoot "app\api\user\route.ts"
if (Test-Path $userApiPath) {
  $uorig = Get-Content $userApiPath -Raw
  $needsV4 = $false
  if ( ($uorig -match 'import\s*\{\s*auth\s*\}\s*from\s*"[^"]*\/auth"\s*;') -or
       ($uorig -match 'export\s+const\s+DELETE\s*=\s*auth\(') ) {
    $needsV4 = $true
  }
  if ($needsV4 -and $ApplyFixes) {
    Backup-IfExists $userApiPath
    @'
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const user = (session?.user ?? null) as (null | { id?: string });
  if (!user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
'@ | Set-Content $userApiPath -Encoding UTF8
    $Changed += $userApiPath
    Write-OK "Rewrote app/api/user/route.ts for NextAuth v4"
  } else {
    Write-OK "app/api/user/route.ts looks OK"
  }
} else {
  Write-OK "app/api/user/route.ts not found"
}

# Step 7: Local build test
Write-Section "Local production build test"
if ($ApplyFixes) {
  try {
    pnpm run build
    if ($LASTEXITCODE -eq 0) {
      Write-OK "Local build passed"
    } else {
      Write-Err "Local build failed"
    }
  } catch {
    Write-Err "Local build threw exception"
  }
} else {
  Write-Warn "Skipped build test (dry run)"
}

# Step 8: Deploy if requested
if ($Deploy -and $ApplyFixes) {
  Write-Section "Deploying to Vercel"
  vercel --prod --yes
}

Write-Section "Summary"
if ($Changed.Count -gt 0) {
  Write-Host "Changed files:" -ForegroundColor Magenta
  $Changed | ForEach-Object { Write-Host " • $_" -ForegroundColor Magenta }
} else {
  Write-Host "No files changed" -ForegroundColor Green
}
