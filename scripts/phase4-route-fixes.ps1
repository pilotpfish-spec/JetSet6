# Save as C:\JetSetNew6\scripts\phase4-route-fixes.ps1
param([string]$ProjectRoot = "C:\JetSetNew6")

$ErrorActionPreference = "Stop"
function Log([string]$m){ Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $m" }
function EnsureDir($p){ if(-not (Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Backup([string]$path){ if(Test-Path $path){ $stamp=Get-Date -Format "yyyyMMdd-HHmmss"; Copy-Item $path ($path+".bak.$stamp") -Force; Log "Backup -> $path.bak.$stamp" } }
function WriteText([string]$path,[string]$content){ EnsureDir (Split-Path -Parent $path); if(Test-Path $path){ $ex=(Get-Content $path -Raw); if($ex -eq $content){ Log "UNCHANGED $path"; return }; Backup $path }; Set-Content $path $content -Encoding UTF8; Log "WROTE   $path" }

Set-Location $ProjectRoot
Log "Root: $ProjectRoot"

# 1) /account → redirect to /account/bookings
$accountIndex = @'
import { redirect } from "next/navigation";
export default function AccountIndex(){ redirect("/account/bookings"); }
'@
WriteText (Join-Path $ProjectRoot "app\account\page.tsx") $accountIndex

# 2) /dashboard → redirect to /account/bookings (for old links/callbacks)
$dashboardIndex = @'
import { redirect } from "next/navigation";
export default function DashboardIndex(){ redirect("/account/bookings"); }
'@
WriteText (Join-Path $ProjectRoot "app\dashboard\page.tsx") $dashboardIndex

# 3) Health endpoint: move _health → health
$oldHealth = Join-Path $ProjectRoot "app\api\_health\auth\route.ts"
$newHealthDir = Join-Path $ProjectRoot "app\api\health\auth"
$newHealth = Join-Path $newHealthDir "route.ts"
if (Test-Path $oldHealth) {
  EnsureDir $newHealthDir
  Copy-Item $oldHealth $newHealth -Force
  Remove-Item $oldHealth -Force
  Log "Moved route: /api/_health/auth → /api/health/auth"
}

# 4) Rewrite lib/auth.ts with safe redirect normalization
$authTs = @'
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const isProd = !!process.env.VERCEL;
const defaultBase = isProd ? "https://jetsetdirect.com" : "http://localhost:3000";
const baseUrl = process.env.NEXTAUTH_URL || defaultBase;
const useSecureCookies = baseUrl.startsWith("https://");

async function sendWithMailgun(to: string, subject: string, text: string, html: string) {
  const apiKey = process.env.MAILGUN_API_KEY!;
  const domain = process.env.MAILGUN_DOMAIN!;
  const from = process.env.EMAIL_FROM!;
  const body = new URLSearchParams();
  body.set("from", from); body.set("to", to);
  body.set("subject", subject); body.set("text", text); body.set("html", html);
  const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
               "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`Mailgun send failed: ${resp.status} ${await resp.text().catch(() => "")}`);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "database" },
  useSecureCookies,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        const subject = "Sign in to JetSet Direct";
        const text = `Click the link to sign in:\n\n${url}\n\nThis link expires shortly.`;
        const html = `
          <p>Click the button below to sign in to <strong>JetSet Direct</strong>:</p>
          <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#0a1a2f;color:#fff;text-decoration:none;border-radius:6px">Sign in</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${url}">${url}</a></p>`;
        await sendWithMailgun(identifier, subject, text, html);
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async redirect({ url }) {
      const base = new URL(baseUrl);
      let target: URL;
      try { target = new URL(url, base); } catch { return base.toString(); }
      // Only allow same-origin
      if (target.origin !== base.origin) return base.toString();
      // Normalize legacy/empty routes
      const path = target.pathname;
      const normalized =
        path === "/dashboard" || path === "/account" || path === "/" ? "/account/bookings" : path;
      return new URL(normalized + target.search + target.hash, base).toString();
    },
    async jwt({ token, user }) { if (user) (token as any).id = (user as any).id; return token; },
    async session({ session, token }) { if (token?.id) (session.user as any).id = token.id as string; return session; },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export default handler;
'@
WriteText (Join-Path $ProjectRoot "lib\auth.ts") $authTs

# Commit & push
git add .
git commit -m "Fix routes: add /account & /dashboard redirects; normalize NextAuth redirect; move health endpoint" | Out-Null
git push origin main | Out-Host
Log "✅ Pushed. After deploy, test:"
Log " - https://jetsetdirect.com/login  (sign in)"
Log " - https://jetsetdirect.com/account  (should redirect to /account/bookings)"
Log " - https://jetsetdirect.com/api/health/auth  (JSON with session/baseUrl)"
