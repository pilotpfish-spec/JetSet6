// C:\JetSetNew6\app\api\user\route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json(
      { message: "User deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
