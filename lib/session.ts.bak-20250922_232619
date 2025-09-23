$target = "C:\JetSetNew6\lib\session.ts"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
if (Test-Path $target) { Copy-Item $target "$target.bak-$ts" -Force }

@'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

// Keep return shape the same as before (user or null)
type MinimalUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
} | null;

export async function getCurrentUser(): Promise<MinimalUser> {
  const raw = await getServerSession(authOptions);
  const session = (raw as unknown) as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  return (session?.user ?? null) as MinimalUser;
}
'@ | Set-Content $target -Encoding UTF8
