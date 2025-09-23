// C:\JetSetNew6\app\(auth)\layout.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (user) {
    if (user.role === "ADMIN") {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  return <div className="min-h-screen">{children}</div>;
}
