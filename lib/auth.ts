// lib/auth.ts  (only the parts below need to change)

const isProd = !!process.env.VERCEL;
const defaultBase = isProd ? "https://jetsetdirect.com" : "http://localhost:3000";
const baseUrl = (process.env.NEXTAUTH_URL || defaultBase).trim();   // <-- trim
const useSecureCookies = baseUrl.startsWith("https://");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "database" },          // we want DB sessions

  useSecureCookies,
  providers: [
    // ... your Google + Email providers unchanged ...
  ],
  pages: { signIn: "/login" },

  callbacks: {
    // works for sign‑in (both strategies)
    async jwt({ token, user }) {
      if (user) (token as any).id = (user as any).id;
      return token;
    },

    // ✅ works for BOTH database and jwt sessions
    async session({ session, token, user }) {
      const id = (user as any)?.id ?? (token as any)?.id;
      if (id) (session.user as any).id = String(id);
      return session;
    },

    async redirect({ url }) {
      const base = new URL(baseUrl);
      const target = new URL(url, base);
      return target.origin === base.origin ? target.toString() : base.toString();
    },
  },
};
