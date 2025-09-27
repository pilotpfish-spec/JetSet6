// C:\JetSetNew6\app\api\register\start\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // your existing Prisma singleton
import { randomToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const clean = String(email || "").trim().toLowerCase();

    if (!isValidEmail(clean)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Ensure user exists (without password)
    let user = await prisma.user.findUnique({ where: { email: clean } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: clean }, // name nullable; emailVerified null until confirm
      });
    }

    // Create verification token (Auth.js Prisma adapter compatible)
    const token = randomToken(24);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await prisma.verificationToken.create({
      data: { identifier: clean, token, expires },
    });

    // Build confirm URL (works on local & prod)
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const url = `${base}/register/confirm?token=${encodeURIComponent(token)}`;

    // Send the email
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
        <h2>Confirm your email</h2>
        <p>Click the button below to confirm your email for JetSet Direct.</p>
        <p><a href="${url}" style="background:#0a66c2;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Confirm Email</a></p>
        <p>If the button doesn't work, copy and paste this URL:<br>${url}</p>
        <p>This link expires in 24 hours.</p>
      </div>
    `;
    await sendMail(clean, "Confirm your email — JetSet Direct", html);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("register/start error", e);
    return NextResponse.json({ error: "Failed to start registration" }, { status: 500 });
  }
}
