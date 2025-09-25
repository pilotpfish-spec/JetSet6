// app/account/bookings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AccountBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div style={{padding:16}}>You must <Link href="/api/auth/signin">sign in</Link> to view bookings.</div>;
  }
  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  if (bookings.length === 0) return <div style={{padding:16}}>No upcoming bookings. <Link href="/quote">Get a quote</Link></div>;

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:24,fontWeight:700,marginBottom:12}}>Your Upcoming Bookings</h1>
      <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e5e7eb"}}>
        <thead><tr><Th>Date</Th><Th>Pickup</Th><Th>Dropoff</Th><Th>Price</Th><Th>Status</Th></tr></thead>
        <tbody>
          {bookings.map((b:any)=>(
            <tr key={b.id}>
              <Td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : "-"}</Td>
              <Td>{b.pickup}</Td><Td>{b.dropoff}</Td>
              <Td>{typeof b.priceCents==="number" ? `$${(b.priceCents/100).toFixed(2)}` : "-"}</Td>
              <Td>{b.status}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const Th=({children}:{children:any})=>(<th style={{border:"1px solid #e5e7eb",padding:8,textAlign:"left"}}>{children}</th>);
const Td=({children}:{children:any})=>(<td style={{border:"1px solid #e5e7eb",padding:8}}>{children}</td>);
