// lib/rbac.ts
import type { Session } from "next-auth";
export function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase() || "";
  return email.endsWith("@jetsetdirect.com");
}
