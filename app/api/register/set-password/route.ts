import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/tokens";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validatePassword(pw: string) {
  return typeof pw === "string" && pw.trim().length >= 8;
}

export async function POST(req: Request) {
  try {
    const { pt, password } = await req.json();

    if (!pt || !validatePassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // pt = short-lived JWT produced by /api/register/confirm
    const payload = await verifyJWT<{ email?: string }>(pt);
    const email = (payload?.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    // Ensure user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Hash and persist to the correct "password" column
    const hash = await bcrypt.hash(String(password), 12);
    const user = await prisma.user.update({
      where: { email },
      data: {
        password: hash,              // ✅ store in password
        passwordHash: null,          // clear out legacy field
        emailVerified: existing.emailVerified ?? new Date(),
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("register/set-password error", e);
    return NextResponse.json(
      { error: "Failed to set password." },
      { status: 500 }
    );
  }
}

