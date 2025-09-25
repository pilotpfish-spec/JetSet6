import { NextResponse } from "next/server";

// Health endpoint for the bare /api/auth path.
// NextAuth lives at /api/auth/[...nextauth] for all real actions.
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, service: "auth" }, { status: 200 });
}
