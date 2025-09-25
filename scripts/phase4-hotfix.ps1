param([string]$ProjectRoot = "C:\JetSetNew6")

$ErrorActionPreference = "Stop"

function Log([string]$m) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $m" }
function EnsureDir($p) { if(-not (Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Backup([string]$path) {
  if (Test-Path $path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item -LiteralPath $path -Destination ($path + ".bak.$stamp") -Force
    Log "Backup -> $path.bak.$stamp"
  }
}
function WriteText([string]$path,[string]$content) {
  EnsureDir (Split-Path -Parent $path)
  if (Test-Path $path) {
    $existing = Get-Content -LiteralPath $path -Raw
    if ($existing -eq $content) { Log "UNCHANGED $path"; return }
    Backup $path
  }
  Set-Content -LiteralPath $path -Value $content -Encoding UTF8
  Log "WROTE   $path"
}

Set-Location $ProjectRoot
Log "Root: $ProjectRoot"

# ---------- lib/auth.ts (database sessions + stable baseUrl) ----------
$authTs = @'
// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Normalize base URL to avoid preview-domain OAuth mismatch
const isProd = !!process.env.VERCEL;
const defaultBase = isProd ? "https://jetsetdirect.com" : "http://localhost:3000";
const baseUrl = process.env.NEXTAUTH_URL || defaultBase;
const useSecureCookies = baseUrl.startsWith("https://");

// --- Mailgun helper ---
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
  if (!resp.ok) throw new Error(`Mailgun send failed: ${resp.status} ${await resp.text().catch(()=>"""")}`);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  // ✅ Persist sessions in Prisma (so Session rows appear)
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
      // Force redirects to baseUrl to avoid preview-domain callback mismatch
      const base = new URL(baseUrl);
      const target = new URL(url, base);
      return target.origin === base.origin ? target.toString() : base.toString();
    },
    async jwt({ token, user }) { if (user) (token as any).id = (user as any).id; return token; },
    async session({ session, token }) { if (token?.id) (session.user as any).id = token.id as string; return session; },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export default handler;
'@
WriteText (Join-Path $ProjectRoot 'lib\auth.ts') $authTs

# ---------- lib/rbac.ts ----------
$rbacTs = @'
// lib/rbac.ts
import type { Session } from "next-auth";
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || "jetsetdirect.com";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(/[;, ]+/).map(s=>s.toLowerCase()).filter(Boolean);
export function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  return email.endsWith(`@${ADMIN_DOMAIN}`);
}
'@
WriteText (Join-Path $ProjectRoot 'lib\rbac.ts') $rbacTs

# ---------- middleware.ts ----------
$middlewareTs = @'
export { default } from "next-auth/middleware";
export const config = { matcher: ["/account/:path*", "/admin/:path*"] };
'@
WriteText (Join-Path $ProjectRoot 'middleware.ts') $middlewareTs

# ---------- app/api/stripe/invoice/route.ts (creates Booking + invoice) ----------
$invoiceTs = @'
// app/api/stripe/invoice/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  unitAmount: number;
  email: string;
  description?: string;
  daysUntilDue?: number;
  dateIso?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  airport?: string;
  terminal?: string;
};

function fmtWhen(dateIso?: string) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined,{dateStyle:"long",timeStyle:"short"});
}
const compact = (s?: string) => (s || "").trim().replace(/\s+/g," ");

export async function POST(req: Request) {
  let step = "start";
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized (sign in required)" }, { status: 401 });
    }
    const body = (await req.json()) as Body;

    step = "validate";
    const cents = Math.round(Number(body.unitAmount));
    if (!Number.isFinite(cents) || cents < 50) return NextResponse.json({ error: "Invalid unitAmount" },{status:400});
    const email = (body.email || "").trim(); if(!email) return NextResponse.json({ error: "Email required" },{status:400});

    step = "format";
    const when = fmtWhen(body.dateIso);
    const pickup = compact(body.pickupAddress);
    const dropoff = compact(body.dropoffAddress);
    const airport = compact(body.airport);
    const terminal = compact(body.terminal);
    const parts: string[] = [];
    if (pickup || dropoff) parts.push([pickup, dropoff].filter(Boolean).join(" → "));
    if (airport && terminal) parts.push(`${airport} — ${terminal}`); else if (airport) parts.push(airport);
    if (when) parts.push(when);
    const lineDescription = body.description || (parts.length ? `Ground Service — ${parts.join(" | ")}` : "Ground Service — Pay Later");

    step = "db.create";
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        pickup, dropoff,
        status: "UNPAID",
        priceCents: cents,
        scheduledAt: body.dateIso ? new Date(body.dateIso) : new Date(),
      },
    });

    step = "stripe.customer";
    const customer = await stripe.customers.create({ email });

    step = "stripe.invoice";
    const custom_fields = [
      when ? { name: "Service Date", value: when } : undefined,
      pickup ? { name: "Pickup", value: pickup } : undefined,
      dropoff ? { name: "Dropoff", value: dropoff } : undefined,
      airport || terminal ? { name: "Airport/Terminal", value: [airport, terminal].filter(Boolean).join(" — ") } : undefined,
    ].filter(Boolean) as { name: string; value: string }[];

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: typeof body.daysUntilDue === "number" ? Math.max(1, Math.floor(body.daysUntilDue)) : 7,
      metadata: { bookingId: booking.id, pickup, dropoff, airport, terminal, dateIso: body.dateIso || "" },
      description: lineDescription,
      footer: "Thank you for choosing JetSet Direct — Ground Service Elevated.",
      ...(custom_fields.length ? { custom_fields } : {}),
    });

    step = "stripe.line";
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: "usd",
      amount: cents,
      description: lineDescription,
      metadata: { bookingId: booking.id },
      invoice: invoice.id,
    });

    step = "stripe.finalize";
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalized.id);

    const url = finalized.hosted_invoice_url || invoice.hosted_invoice_url;
    if (!url) return NextResponse.json({ error: "Invoice URL unavailable" }, { status: 500 });

    return NextResponse.json({
      bookingId: booking.id,
      invoiceId: finalized.id,
      url,
      amountDue: finalized.amount_due,
      currency: finalized.currency,
      status: finalized.status,
    });
  } catch (err: any) {
    console.error("invoice error @", step, err?.message || err);
    return NextResponse.json({ error: "Internal error", step }, { status: 500 });
  }
}
'@
WriteText (Join-Path $ProjectRoot 'app\api\stripe\invoice\route.ts') $invoiceTs

# ---------- app/admin/page.tsx ----------
$adminPageTsx = @'
// app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return <div style={{padding:16}}>Access denied.</div>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const weekAhead = new Date(now); weekAhead.setDate(weekAhead.getDate() + 7);

  const [unpaid, today, upcoming] = await Promise.all([
    prisma.booking.findMany({ where: { status: "UNPAID" }, orderBy: { scheduledAt: "asc" }, take: 25 }),
    prisma.booking.findMany({ where: { scheduledAt: { gte: todayStart, lt: todayEnd } }, orderBy: { scheduledAt: "asc" }, take: 25 }),
    prisma.booking.findMany({ where: { scheduledAt: { gte: now, lt: weekAhead } }, orderBy: { scheduledAt: "asc" }, take: 25 }),
  ]);

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:24,fontWeight:700,marginBottom:12}}>Admin Dashboard</h1>
      <Section title="Unpaid Bookings" items={unpaid} />
      <Section title="Today’s Rides" items={today} />
      <Section title="Upcoming (7 days)" items={upcoming} />
    </div>
  );
}

function Section({title, items}:{title:string, items:any[]}) {
  return (
    <div style={{marginBottom:24}}>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:8}}>{title}</h2>
      {items.length === 0 ? <div style={{color:"#6b7280"}}>No records</div> : (
        <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e5e7eb"}}>
          <thead><tr><Th>Date</Th><Th>Pickup</Th><Th>Dropoff</Th><Th>Price</Th><Th>Status</Th></tr></thead>
          <tbody>
            {items.map((b:any)=>(
              <tr key={b.id}>
                <Td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : "-"}</Td>
                <Td>{b.pickup}</Td><Td>{b.dropoff}</Td>
                <Td>{typeof b.priceCents==="number" ? `$${(b.priceCents/100).toFixed(2)}` : "-"}</Td>
                <Td>{b.status}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
const Th=({children}:{children:any})=>(<th style={{border:"1px solid #e5e7eb",padding:8,textAlign:"left"}}>{children}</th>);
const Td=({children}:{children:any})=>(<td style={{border:"1px solid #e5e7eb",padding:8}}>{children}</td>);
'@
WriteText (Join-Path $ProjectRoot 'app\admin\page.tsx') $adminPageTsx

# ---------- app/account/bookings/page.tsx ----------
$acctBookingsTsx = @'
// app/account/bookings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AccountBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div style={{padding:16}}>You must <Link href="/api/auth/signin">sign in</Link> to view bookings.</div>;
  }
  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  if (bookings.length === 0) return <div style={{padding:16}}>No upcoming bookings. <Link href="/quote">Get a quote</Link></div>;

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:24,fontWeight:700,marginBottom:12}}>Your Upcoming Bookings</h1>
      <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e5e7eb"}}>
        <thead><tr><Th>Date</Th><Th>Pickup</Th><Th>Dropoff</Th><Th>Price</Th><Th>Status</Th></tr></thead>
        <tbody>
          {bookings.map((b:any)=>(
            <tr key={b.id}>
              <Td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : "-"}</Td>
              <Td>{b.pickup}</Td><Td>{b.dropoff}</Td>
              <Td>{typeof b.priceCents==="number" ? `$${(b.priceCents/100).toFixed(2)}` : "-"}</Td>
              <Td>{b.status}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const Th=({children}:{children:any})=>(<th style={{border:"1px solid #e5e7eb",padding:8,textAlign:"left"}}>{children}</th>);
const Td=({children}:{children:any})=>(<td style={{border:"1px solid #e5e7eb",padding:8}}>{children}</td>);
'@
WriteText (Join-Path $ProjectRoot 'app\account\bookings\page.tsx') $acctBookingsTsx

# ---------- package.json: ensure prisma migrate deploy on build ----------
$pkgPath = Join-Path $ProjectRoot 'package.json'
if(Test-Path $pkgPath){
  $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
  if(-not $pkg.scripts){ $pkg | Add-Member -NotePropertyName scripts -NotePropertyValue @{} }
  $pkg.scripts.build = "prisma generate && prisma migrate deploy && next build"
  ($pkg | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $pkgPath -Encoding UTF8
  Log "Patched package.json build script."
}

# ---------- commit & push ----------
git add .
git commit -m "Phase 4 hotfix: DB sessions, invoice->Booking, admin/account pages, middleware, migrate on build" | Out-Null
git push origin main | Out-Host
Log "✅ Pushed to main. Vercel will deploy production."
