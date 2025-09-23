import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

// Keep return shape the same as before (user or null)
type MinimalUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
} | null;

export async function getCurrentUser(): Promise<MinimalUser> {
  const raw = await getServerSession(authOptions);
  const session = (raw as unknown) as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  return (session?.user ?? null) as MinimalUser;
}
