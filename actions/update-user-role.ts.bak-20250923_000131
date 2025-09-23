"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ResponseAction = { status: "success" | "error" };

type MaybeRoleUser = { role?: string | null } | null | undefined;

export async function updateUserRole(userId: string, role: string): Promise<ResponseAction> {
  const raw = await getServerSession(authOptions);
  const session = raw as any as
    | (Session & { user?: MaybeRoleUser })
    | { user?: MaybeRoleUser }
    | null;

  const currentRole = (session?.user as MaybeRoleUser)?.role ?? null;
  if (currentRole !== "ADMIN") {
    return { status: "error" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}
