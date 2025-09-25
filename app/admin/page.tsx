// app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return <div style={{padding:16}}>Access denied.</div>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const weekAhead = new Date(now); weekAhead.setDate(weekAhead.getDate() + 7);

  const [unpaid, today, upcoming] = await Promise.all([
    prisma.booking.findMany({ where: { status: "UNPAID" }, orderBy: { scheduledAt: "asc" }, take: 25 }),
    prisma.booking.findMany({ where: { scheduledAt: { gte: todayStart, lt: todayEnd } }, orderBy: { scheduledAt: "asc" }, take: 25 }),
    prisma.booking.findMany({ where: { scheduledAt: { gte: now, lt: weekAhead } }, orderBy: { scheduledAt: "asc" }, take: 25 }),
  ]);

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:24,fontWeight:700,marginBottom:12}}>Admin Dashboard</h1>
      <Section title="Unpaid Bookings" items={unpaid} />
      <Section title="Today’s Rides" items={today} />
      <Section title="Upcoming (7 days)" items={upcoming} />
    </div>
  );
}

function Section({title, items}:{title:string, items:any[]}) {
  return (
    <div style={{marginBottom:24}}>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:8}}>{title}</h2>
      {items.length === 0 ? <div style={{color:"#6b7280"}}>No records</div> : (
        <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e5e7eb"}}>
          <thead><tr><Th>Date</Th><Th>Pickup</Th><Th>Dropoff</Th><Th>Price</Th><Th>Status</Th></tr></thead>
          <tbody>
            {items.map((b:any)=>(
              <tr key={b.id}>
                <Td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : "-"}</Td>
                <Td>{b.pickup}</Td><Td>{b.dropoff}</Td>
                <Td>{typeof b.priceCents==="number" ? `$${(b.priceCents/100).toFixed(2)}` : "-"}</Td>
                <Td>{b.status}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
const Th=({children}:{children:any})=>(<th style={{border:"1px solid #e5e7eb",padding:8,textAlign:"left"}}>{children}</th>);
const Td=({children}:{children:any})=>(<td style={{border:"1px solid #e5e7eb",padding:8}}>{children}</td>);
