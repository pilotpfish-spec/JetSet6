import { getServerSession } from "next-auth/next";
import { signIn, signOut, useSession } from "next-auth/react";
import { authOptions } from "@/lib/auth";

// v4-compatible "auth()" used in server components
export async function auth() {
  return getServerSession(authOptions);
}

// Re-export common client helpers so existing imports keep working
export { signIn, signOut, useSession };
