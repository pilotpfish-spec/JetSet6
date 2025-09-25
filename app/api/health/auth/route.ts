// app/api/health/auth/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    ok: true,
    user: session?.user || null,
    hasId: !!(session as any)?.user?.id,
    baseUrl: process.env.NEXTAUTH_URL || null,
    vercel: !!process.env.VERCEL,
  });
}
