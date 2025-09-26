import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getCurrentUser(session: any) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

/**
 * PUT /api/bookings/[id]
 * Update an existing booking (must belong to user).
 * Body: { pickupAddress?, dropoffAddress?, scheduledAt?, priceCents?, notes?, status? }
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const booking = await prisma.booking.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      pickupAddress: body.pickupAddress ?? booking.pickupAddress,
      dropoffAddress: body.dropoffAddress ?? booking.dropoffAddress,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : booking.scheduledAt,
      priceCents: body.priceCents ?? booking.priceCents,
      notes: body.notes ?? booking.notes,
      status: body.status ?? booking.status,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/bookings/[id]
 * Delete a booking (must belong to user).
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.booking.delete({ where: { id: booking.id } });
  return NextResponse.json({ ok: true });
}
