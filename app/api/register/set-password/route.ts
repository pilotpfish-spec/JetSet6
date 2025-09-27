// C:\JetSetNew6\app\api\register\set-password\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/tokens";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { pt, password } = await req.json();
    if (!pt || !password || String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 chars" }, { status: 400 });
    }

    const { email } = await verifyJWT<{ email: string }>(pt);
    if (!email) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    const hash = await bcrypt.hash(String(password), 12);

    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
      select: { id: true, email: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("register/set-password error", e);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}
