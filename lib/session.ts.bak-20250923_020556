import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Narrow user shape used across the app.
 * NOTE: "role" is optional and string-widened so we don't block on enum wiring.
 */
export type MinimalUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null; // <- important: allow user?.role
} | null;

export async function getCurrentUser(): Promise<MinimalUser> {
  const raw = await getServerSession(authOptions);
  const session = raw as unknown as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  return (session?.user ?? null) as MinimalUser;
}

// Back-compat alias used throughout the app
export const getUser = getCurrentUser;
