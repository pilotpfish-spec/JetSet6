# scripts\rollback-nextauth-v4.ps1
# Roll back NextAuth to v4 and install a stable, known-good auth setup.
# - Backs up files
# - Pins packages
# - Writes v4-compatible auth files and middleware
# - Ensures NEXTAUTH_SECRET is present (reuses AUTH_SECRET if found)

$ErrorActionPreference = "Stop"

# --- Paths ---
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $root) { $root = "." }
Set-Location $root
$repo = Resolve-Path "..\"
if (Test-Path ".\.git") { $repo = (Get-Location).Path }

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = Join-Path $repo ("rollback-backup-" + $timestamp)
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Files to back up (only those that exist)
$filesToBackup = @(
  "package.json",
  "package-lock.json",
  ".env.local",
  "auth.ts",
  "auth.config.ts",
  "middleware.ts",
  "lib\auth.ts",
  "lib\session.ts",
  "app\api\auth\[...nextauth]\route.ts"
)

Write-Host "Backing up files to $backupDir ..." -ForegroundColor Cyan
foreach ($rel in $filesToBackup) {
  $full = Join-Path $repo $rel
  if (Test-Path $full) {
    $destFolder = Split-Path (Join-Path $backupDir $rel) -Parent
    New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
    Copy-Item $full (Join-Path $backupDir $rel) -Force
  }
}

# --- Packages: pin to v4 (+ adapter) ---
Write-Host "Rolling packages to NextAuth v4 ..." -ForegroundColor Cyan

# Remove v5 adapter if present
npm remove @auth/prisma-adapter | Out-Null

# Install v4 + matching adapter + bcryptjs
npm install `
  next-auth@^4 `
  @next-auth/prisma-adapter@^1 `
  bcryptjs@^2 | Out-Null

# --- Ensure folders exist ---
New-Item -ItemType Directory -Force -Path (Join-Path $repo "lib") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $repo "app\api\auth\[...nextauth]") | Out-Null

# --- .env.local: ensure NEXTAUTH_SECRET present (reuse AUTH_SECRET if possible) ---
$envPath = Join-Path $repo ".env.local"
if (Test-Path $envPath) {
  $envText = Get-Content $envPath -Raw
  $hasNextAuthSecret = $envText -match "(?m)^\s*NEXTAUTH_SECRET\s*="
  if (-not $hasNextAuthSecret) {
    # Try to reuse AUTH_SECRET
    $authSecretMatch = Select-String -Path $envPath -Pattern '^\s*AUTH_SECRET\s*=\s*(.+)$' -AllMatches
    if ($authSecretMatch.Matches.Count -gt 0) {
      $secretValue = $authSecretMatch.Matches[0].Groups[1].Value.Trim()
    } else {
      # Generate a random base64 secret
      $bytes = New-Object byte[] 32
      (New-Object System.Random).NextBytes($bytes)
      $secretValue = [Convert]::ToBase64String($bytes)
    }
    Add-Content -Path $envPath -Value "`r`nNEXTAUTH_SECRET=$secretValue"
    Write-Host "NEXTAUTH_SECRET added to .env.local" -ForegroundColor Yellow
  }

  # Ensure NEXTAUTH_URL for dev
  $hasUrl = $envText -match "(?m)^\s*NEXTAUTH_URL\s*="
  if (-not $hasUrl) {
    Add-Content -Path $envPath -Value "`r`nNEXTAUTH_URL=http://localhost:3000"
    Write-Host "NEXTAUTH_URL added to .env.local" -ForegroundColor Yellow
  }
}

# --- Write known-good v4 files ---

# lib/auth.ts (v4 config-only)
@'
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;

        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        (session.user as any) = {
          ...(session.user || {}),
          id: token.id as string,
        };
      }
      return session;
    },
  },
};
'@ | Set-Content -Encoding UTF8 (Join-Path $repo "lib\auth.ts")

# app/api/auth/[...nextauth]/route.ts (v4 route handler)
@'
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
'@ | Set-Content -Encoding UTF8 (Join-Path $repo "app\api\auth\[...nextauth]\route.ts")

# auth.ts (root) - v4 shim to satisfy imports of "@/auth"
@'
import { getServerSession } from "next-auth/next";
import { signIn, signOut, useSession } from "next-auth/react";
import { authOptions } from "@/lib/auth";

// v4-compatible "auth()" used in server components
export async function auth() {
  return getServerSession(authOptions);
}

// Re-export common client helpers so existing imports keep working
export { signIn, signOut, useSession };
'@ | Set-Content -Encoding UTF8 (Join-Path $repo "auth.ts")

# lib/session.ts - safe helpers (covers common patterns)
@'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function auth() {
  return getServerSession(authOptions);
}

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function currentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
'@ | Set-Content -Encoding UTF8 (Join-Path $repo "lib\session.ts")

# middleware.ts - v4 withAuth, protect selected routes
@'
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/booking/:path*",
  ],
};
'@ | Set-Content -Encoding UTF8 (Join-Path $repo "middleware.ts")

Write-Host "Rollback files written." -ForegroundColor Green

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1) Start the dev server: npm run dev"
Write-Host "2) In another terminal, test:" 
Write-Host "   curl -i http://localhost:3000/api/auth/session"
Write-Host "3) Open http://localhost:3000/login and try Google or Credentials."
Write-Host ""
Write-Host "Backup folder: $backupDir" -ForegroundColor Yellow
