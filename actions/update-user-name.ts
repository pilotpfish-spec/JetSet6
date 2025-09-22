"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { userNameSchema } from "@/lib/validations/user"

export type FormData = {
  name: string
}

export async function updateUserName(
  userId: string,
  data: FormData
): Promise<{ status: "success" | "error" }> {
  try {
    // Validate input against schema
    const parsed = userNameSchema.safeParse(data)
    if (!parsed.success) {
      return { status: "error" }
    }

    // Check session
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
      return { status: "error" }
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name },
    })

    // Revalidate any pages showing user info
    revalidatePath("/dashboard")
    revalidatePath("/settings")

    return { status: "success" }
  } catch (err) {
    console.error("❌ updateUserName error:", err)
    return { status: "error" }
  }
}
