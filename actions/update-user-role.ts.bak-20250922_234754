"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma, UserRole } from "@/lib/db";
import { userRoleSchema } from "@/lib/validations/user";

export type FormData = {
  role: "USER" | "ADMIN";
};

export async function updateUserRole(
  userId: string,
  data: FormData
): Promise<{ status: "success" | "error" }> {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return { status: "error" };
    }

    const validatedData = userRoleSchema.parse(data);

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: validatedData.role as UserRole,
      },
    });

    revalidatePath("/admin");
    return { status: "success" };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { status: "error" };
  }
}
