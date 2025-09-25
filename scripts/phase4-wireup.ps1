param([string]$ProjectRoot = "C:\JetSetNew6")
$ErrorActionPreference = "Stop"

function Log($m){ Write-Host $m }
function Ensure-Dir($p){ New-Item -ItemType Directory -Force -Path $p | Out-Null }
function Backup-File($path){
  if(Test-Path $path){
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item -LiteralPath $path -Destination ($path + ".bak.$stamp") -Force
    Log "Backup -> $path.bak.$stamp"
  }
}
function Write-Text($path, $content){
  Ensure-Dir (Split-Path -Parent $path)
  if(Test-Path $path){
    $existing = Get-Content -LiteralPath $path -Raw
    if($existing -eq $content){ Log "UNCHANGED $path"; return }
    Backup-File $path
  }
  Set-Content -LiteralPath $path -Value $content -Encoding UTF8
  Log "WROTE $path"
}

# -------- 0) Preflight
Set-Location $ProjectRoot
Log "Root: $ProjectRoot"

# -------- 1) Patch prisma\schema.prisma
$schemaPath = Join-Path $ProjectRoot "prisma\schema.prisma"
$schema = Get-Content -LiteralPath $schemaPath -Raw
$orig = $schema
$schema = [regex]::Replace($schema,"(?s)(model\s+Booking\s*\{)(.*?)(\})",{
  param($m)
  $body=$m.Groups[2].Value
  if($body -notmatch "scheduledAt"){ $body += "`n  scheduledAt DateTime" }
  if($body -notmatch "priceCents"){ $body += "`n  priceCents Int" }
  $m.Groups[1].Value+$body+"`n"+$m.Groups[3].Value
})
if($schema -ne $orig){
  Backup-File $schemaPath
  Set-Content -LiteralPath $schemaPath -Value $schema -Encoding UTF8
  Log "Patched prisma\schema.prisma"
  & npx prisma migrate dev --name "phase4-booking-fields" | Write-Host
}else{ Log "Schema already patched" }

# -------- 2) Middleware
$middleware = @"
export { default } from "next-auth/middleware";
export const config = { matcher: ["/account/:path*", "/admin/:path*"] };
"@
Write-Text (Join-Path $ProjectRoot "middleware.ts") $middleware

# -------- 3) RBAC helper
$rbac = @"
// lib/rbac.ts
import type { Session } from "next-auth";
export function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase() || "";
  return email.endsWith("@jetsetdirect.com");
}
"@
Write-Text (Join-Path $ProjectRoot "lib\rbac.ts") $rbac

# -------- 4) DB accessor
$db = @"
// lib/db.ts
export async function getDb() {
  const mod = await import("./prisma");
  return (mod as any).prisma ?? (mod as any).default;
}
"@
Write-Text (Join-Path $ProjectRoot "lib\db.ts") $db

# -------- 5) Admin page
$adminPage = @"
// app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getDb } from "@/lib/db";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return <p>Access denied</p>;
  const prisma = await getDb();
  const bookings = await prisma.booking.findMany({ take: 10 });
  return <pre>{JSON.stringify(bookings,null,2)}</pre>;
}
"@
Write-Text (Join-Path $ProjectRoot "app\admin\page.tsx") $adminPage

# -------- 6) Account bookings page
$accountBookings = @"
// app/account/bookings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function AccountBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <p>Sign in to view bookings</p>;
  const prisma = await getDb();
  const bookings = await prisma.booking.findMany({ where:{userId:session.user.id}, take: 10 });
  return <pre>{JSON.stringify(bookings,null,2)}</pre>;
}
"@
Write-Text (Join-Path $ProjectRoot "app\account\bookings\page.tsx") $accountBookings

Log "✅ Phase 4 wire-up completed."
