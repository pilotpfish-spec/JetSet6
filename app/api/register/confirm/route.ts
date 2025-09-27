// C:\JetSetNew6\app\api\register\confirm\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signShortLivedJWT } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const row = await prisma.verificationToken.findUnique({ where: { token } });

    if (!row || row.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Mark email verified
    await prisma.user.update({
      where: { email: row.identifier },
      data: { emailVerified: new Date() },
    });

    // Consume the token
    await prisma.verificationToken.delete({ where: { token } });

    // Create a short-lived JWT for password setup
    const pt = await signShortLivedJWT({ email: row.identifier }, 20); // 20 minutes
    return NextResponse.json({ ok: true, pt });
  } catch (e) {
    console.error("register/confirm error", e);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }
}
