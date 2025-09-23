"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export type ResponseAction = { status: "success" | "error" };

type MinimalUser = { id?: string; email?: string | null } | null | undefined;

export async function updateUserName(userId: string, name: string): Promise<ResponseAction> {
  const raw = await getServerSession(authOptions);
  const session = raw as any as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  const user = session?.user as MinimalUser;

  if (!user?.id || user.id !== userId) {
    return { status: "error" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}
