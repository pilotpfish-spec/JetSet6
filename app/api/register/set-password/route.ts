import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { signIn } from "next-auth/react";

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "changeme";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Decode token to get email
    let email: string | null = null;
    try {
      const decoded = jwt.verify(token, TOKEN_SECRET) as { email?: string };
      email = decoded.email || null;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email not found in token" },
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

    // Attempt to sign them in immediately
    await signIn("credentials", {
      redirect: false,
      email: user.email,
      password,
    });

    // Redirect user straight to account page
    return NextResponse.redirect(new URL("/account", req.url));
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json(
      { error: "Failed to set password" },
      { status: 500 }
    );
  }
}
