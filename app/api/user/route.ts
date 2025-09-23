import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

// minimal user shape we rely on
type MinimalUser = { id?: string } | null | undefined;

export async function DELETE() {
  // Defensive cast so CI can’t collapse the session type to {}
  const raw = await getServerSession(authOptions);
  const session = (raw as unknown) as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  const user = session?.user as MinimalUser;

  if (!user?.id) {
    return new Response("Not authenticated", { status: 401 });
  }

  try {
    await prisma.user.delete({ where: { id: user.id! } });
    return new Response("User deleted successfully!", { status: 200 });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
