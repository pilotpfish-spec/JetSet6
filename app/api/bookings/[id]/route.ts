// app/api/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/bookings/[id] → cancel a booking (for current user only)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find current user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure the booking belongs to this user
  const booking = await prisma.booking.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ Mark booking as cancelled and return updated record
  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json(updated);
}
