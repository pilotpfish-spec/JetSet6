// app/account/bookings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AccountBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <div style={{ padding: 16 }}>
        You must <Link href="/api/auth/signin">sign in</Link> to view bookings.
      </div>
    );
  }

  // Resolve userId either from the session or by email
  let userId = (session.user as any).id as string | undefined;
  if (!userId && session.user.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id ?? undefined;
  }

  if (!userId) {
    return (
      <div style={{ padding: 16 }}>
        We couldn’t find your account. Please sign out and sign back in.
      </div>
    );
  }

  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      scheduledAt: { gte: now },
      NOT: { status: { in: ["CANCELLED", "COMPLETED"] as any } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Your Upcoming Bookings</h1>
        <Link href="/account" style={{ textDecoration: "underline" }}>
          Account settings →
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div>
          <div style={{ color: "#6b7280", marginBottom: 8 }}>No upcoming bookings.</div>
          <Link href="/quote" style={{ textDecoration: "underline" }}>
            Get a quote →
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Pickup</Th>
              <Th>Dropoff</Th>
              <Th>Price</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b: any) => (
              <tr key={b.id}>
                <Td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : "-"}</Td>
                <Td>{b.pickup || "-"}</Td>
                <Td>{b.dropoff || "-"}</Td>
                <Td>{typeof b.priceCents === "number" ? `$${(b.priceCents / 100).toFixed(2)}` : "-"}</Td>
                <Td>{b.status}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const Th = ({ children }: { children: any }) => (
  <th style={{ border: "1px solid #e5e7eb", padding: 8, textAlign: "left" }}>{children}</th>
);
const Td = ({ children }: { children: any }) => <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{children}</td>;
