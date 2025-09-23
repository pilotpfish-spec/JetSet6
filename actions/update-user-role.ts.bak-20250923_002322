"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

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
    // Cast the incoming string to the Prisma enum (avoids breaking callers)
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
    });
    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}
