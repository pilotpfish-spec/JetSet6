// C:\JetSetNew6\app\(auth)\layout.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";
type MinimalUser = { id?: string; email?: string | null; name?: string | null; image?: string | null; role?: string } | null | undefined;

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
const raw = await getServerSession(authOptions);
const session = raw as any as (Session & { user?: MinimalUser }) | { user?: MinimalUser } | null;
const user = session?.user as MinimalUser;

  if (user) {
    if (user.role === "ADMIN") {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  return <div className="min-h-screen">{children}</div>;
}
