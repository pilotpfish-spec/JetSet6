// app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getDb } from "@/lib/db";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return <p>Access denied</p>;
  const prisma = await getDb();
  const bookings = await prisma.booking.findMany({ take: 10 });
  return <pre>{JSON.stringify(bookings,null,2)}</pre>;
}
