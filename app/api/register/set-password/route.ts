// C:\JetSetNew6\app\api\register\set-password\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json(
      { error: "Failed to set password" },
      { status: 500 }
    );
  }
}
