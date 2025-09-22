// C:\JetSetNew6\lib\session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Get the full NextAuth session (or null if not logged in)
export async function getSession() {
  return await getServerSession(authOptions);
}

// Get just the user object (or null if not logged in)
export async function getUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
