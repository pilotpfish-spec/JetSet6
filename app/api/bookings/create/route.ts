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
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let data: any = {};
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    pickupAddress = "",
    dropoffAddress = "",
    scheduledAt,
    priceCents,
    notes = "",
    airport = null,
    terminal = null,
  } = data;

  if (!scheduledAt || !priceCents) {
    return NextResponse.json(
      { error: "Missing required fields: scheduledAt or priceCents" },
      { status: 400 }
    );
  }

  try {
    // 1. Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        pickupAddress,
        dropoffAddress,
        airport,
        terminal,
        scheduledAt: new Date(scheduledAt),
        date: new Date(), // legacy "date" field
        priceCents: Number(priceCents),
        totalCents: Number(priceCents), // keep in sync
        notes,
        status: "PENDING",
      },
    });

    // 2. Save pickup & dropoff addresses into Address table (if provided)
    const addressOps: any[] = [];
    if (pickupAddress) {
      addressOps.push(
        prisma.address.upsert({
          where: {
            userId_label: {
              userId: user.id,
              label: "Pickup",
            },
          },
          update: {
            line1: pickupAddress,
          },
          create: {
            userId: user.id,
            label: "Pickup",
            line1: pickupAddress,
            city: "",
            state: "",
            postalCode: "",
          },
        })
      );
    }
    if (dropoffAddress) {
      addressOps.push(
        prisma.address.upsert({
          where: {
            userId_label: {
              userId: user.id,
              label: "Dropoff",
            },
          },
          update: {
            line1: dropoffAddress,
          },
          create: {
            userId: user.id,
            label: "Dropoff",
            line1: dropoffAddress,
            city: "",
            state: "",
            postalCode: "",
          },
        })
      );
    }
    if (addressOps.length > 0) {
      await Promise.all(addressOps);
    }

    // 3. Fire-and-forget notify hook (optional)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: booking.id,
        pickupAddress,
        dropoffAddress,
        airport,
        terminal,
      }),
    }).catch(() => {
      // don’t block booking creation if notify fails
    });

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      booking,
    });
  } catch (err) {
    console.error("Booking creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
