import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Resolve current user from session (by email).
 */
async function getCurrentUser(session: any) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

/**
 * GET /api/addresses
 * Returns all addresses for the current user (default first, then by createdAt)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) {
    // Return empty array for unauthenticated instead of 401 to keep UI friendly
    return NextResponse.json([], { status: 200 });
  }

  const items = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(items);
}

/**
 * POST /api/addresses
 * Create a new address for the current user.
 * Body: { label?, line1, line2?, city, state, postalCode, isDefault? }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { label, line1, line2, city, state, postalCode, isDefault } = body || {};

  if (!line1 || !city || !state || !postalCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // If setting a default, clear any existing default first.
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const created = await prisma.address.create({
    data: {
      userId: user.id,
      label: label ?? "Saved Address",
      line1,
      line2: line2 ?? "",
      city,
      state,
      postalCode,
      isDefault: Boolean(isDefault),
    },
  });

  return NextResponse.json(created, { status: 201 });
}

/**
 * PUT /api/addresses
 * Update an existing address (must belong to current user).
 * Body: { id, label?, line1?, line2?, city?, state?, postalCode?, isDefault? }
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, label, line1, line2, city, state, postalCode, isDefault } = body || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.address.findFirst({
    where: { id: id.toString(), userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (typeof isDefault === "boolean" && isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id: existing.id },
    data: {
      label: label ?? existing.label,
      line1: line1 ?? existing.line1,
      line2: typeof line2 === "string" ? line2 : existing.line2,
      city: city ?? existing.city,
      state: state ?? existing.state,
      postalCode: postalCode ?? existing.postalCode,
      isDefault: typeof isDefault === "boolean" ? isDefault : existing.isDefault,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/addresses?id=ADDRESS_ID
 * Deletes an address owned by the current user.
 */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.address.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
