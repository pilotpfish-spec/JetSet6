import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET all addresses for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json([], { status: 200 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return NextResponse.json([], { status: 200 });

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(addresses);
}

// POST create a new address
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { line1, label = "Saved Address" } = body;

  if (!line1) {
    return NextResponse.json({ error: "Missing line1" }, { status: 400 });
  }

  // Try to parse city/state/zip if the string is a Google formatted address
  let city = "";
  let state = "";
  let postalCode = "";

  const parts = line1.split(",");
  if (parts.length >= 3) {
    city = parts[parts.length - 3]?.trim() || "";
    const stateZip = parts[parts.length - 2]?.trim() || "";
    const stateZipParts = stateZip.split(" ");
    state = stateZipParts[0] || "";
    postalCode = stateZipParts[1] || "";
  }

  try {
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label,
        line1,
        city,
        state,
        postalCode,
      },
    });

    return NextResponse.json(address);
  } catch (err) {
    console.error("Address save failed", err);
    return NextResponse.json({ error: "Failed to save address" }, { status: 500 });
  }
}

// DELETE /api/addresses?id=ADDRESS_ID
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const address = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!address) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
