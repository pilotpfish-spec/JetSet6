import { notFound, redirect } from "next/navigation";

import { getUser } from "@/lib/session";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function Dashboard({ children }: ProtectedLayoutProps) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return <>{children}</>;
}

