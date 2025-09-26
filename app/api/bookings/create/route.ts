// app/api/bookings/create/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the actual Prisma user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data = await req.json().catch(() => ({}));
  const {
    pickupAddress = "",
    dropoffAddress = "",
    scheduledAt,
    priceCents,
    notes = "",
  } = data || {};

  if (!scheduledAt || !priceCents) {
    return NextResponse.json({ error: "Missing scheduledAt or priceCents" }, { status: 400 });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        pickupAddress,
        dropoffAddress,
        scheduledAt: new Date(scheduledAt),
        date: new Date(), // legacy field, keep "now"
        priceCents: Number(priceCents),
        notes,
        status: "PENDING",
      },
    });

    // Optional: send notify webhook
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, pickupAddress, dropoffAddress }),
        cache: "no-store",
      });
    } catch {}

    return NextResponse.json({ ok: true, bookingId: booking.id });
  } catch (err) {
    console.error("Booking creation failed", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
