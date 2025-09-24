// app/api/account/summary/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/account/summary
 * Returns upcoming and past bookings for the signed-in user.
 * Maps your Booking model:
 *  - date (DateTime) -> whenISO
 *  - pickupAddress, dropoffAddress
 *  - status (PENDING|CONFIRMED|CANCELLED) -> unpaid|paid|cancelled
 *  - totalCents (Int?), receiptUrl (String?)
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  // Keep the UI friendly: if not signed in, return empty sets (200)
  if (!session?.user?.id) {
    return noStoreJson({ upcoming: [], past: [] });
  }

  try {
    const rows = await prisma.booking.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    });

    const now = new Date();

    const mapRow = (b: any) => ({
      id: b.id as string,
      whenISO: new Date(b.date).toISOString(),
      pickup: (b.pickupAddress as string) ?? "—",
      dropoff: (b.dropoffAddress as string) ?? "—",
      status: statusToUi(b.status as string),
      totalCents: b.totalCents as number | null | undefined,
      receiptUrl: (b.receiptUrl as string) ?? undefined,
    });

    const upcoming = rows.filter((b) => new Date(b.date) >= now).map(mapRow);
    const past = rows.filter((b) => new Date(b.date) < now).map(mapRow);

    return noStoreJson({ upcoming, past });
  } catch (err) {
    // If anything unexpected happens, don't break the page.
    return noStoreJson({ upcoming: [], past: [] });
  }
}

/** Map DB enum → UI status */
function statusToUi(dbStatus: string): "unpaid" | "paid" | "cancelled" {
  switch (dbStatus) {
    case "CONFIRMED":
      return "paid";
    case "CANCELLED":
      return "cancelled";
    case "PENDING":
    default:
      return "unpaid";
  }
}

/** Utility: send JSON with `no-store` so the client always sees fresh data */
function noStoreJson(data: unknown, init?: number | ResponseInit) {
  const base: ResponseInit =
    typeof init === "number" ? { status: init } : init ?? {};
  const headers = new Headers(base.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(data, { ...base, headers });
}
