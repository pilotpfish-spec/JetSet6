// C:\JetSetNew6\app\api\auth\[...nextauth]\route.ts

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// ✅ Correct App Router exports
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
