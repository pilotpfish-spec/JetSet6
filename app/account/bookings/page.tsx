// app/account/bookings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function AccountBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <p>Sign in to view bookings</p>;
  const prisma = await getDb();
  const bookings = await prisma.booking.findMany({ where:{userId:session.user.id}, take: 10 });
  return <pre>{JSON.stringify(bookings,null,2)}</pre>;
}
