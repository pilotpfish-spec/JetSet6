// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/bookings → list current user's bookings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json([], { status: 200 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([], { status: 200 });

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(bookings);
}

// PUT /api/bookings → update a booking
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, pickupAddress, dropoffAddress, scheduledAt, priceCents } = body;

  if (!id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { id, userId: user.id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      pickupAddress: pickupAddress ?? booking.pickupAddress,
      dropoffAddress: dropoffAddress ?? booking.dropoffAddress,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : booking.scheduledAt,
      priceCents: priceCents ?? booking.priceCents,
      status: "PENDING",
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/bookings?id=BOOKING_ID
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { id, userId: user.id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.booking.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
