import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.json();
  const {
    paymentMethod = "pay_later",
    customerName = "Guest",
    customerEmail = "",
    phone = "",
    date = "",
    pickupAddress = "",
    dropoffAddress = "",
    distance = 0,
    fare = 0,
    notes = "",
  } = data || {};

  let dbSaved = false;
  let bookingId: string | null = null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const result: any = await (prisma as any).booking.create({
      data: {
        customerName,
        customerEmail,
        phone,
        date,
        pickupAddress,
        dropoffAddress,
        distance,
        fare,
        notes,
        paymentMethod, // "pay_later" | "card"
        status: paymentMethod === "pay_later" ? "PENDING" : "UNPAID",
      },
    });
    bookingId = result?.id ?? null;
    dbSaved = true;
  } catch { dbSaved = false; }

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/bookings/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, paymentMethod }),
      cache: "no-store",
    });
  } catch {}

  return NextResponse.json({ ok: true, bookingId, dbSaved, paymentMethod });
}
