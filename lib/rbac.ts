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
