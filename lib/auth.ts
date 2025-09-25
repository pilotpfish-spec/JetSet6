// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Base URL determines cookie security and redirect behavior
const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const useSecureCookies = baseUrl.startsWith("https://");

// --- Mailgun helper (no extra deps) ---
async function sendWithMailgun(to: string, subject: string, text: string, html: string) {
  const apiKey = process.env.MAILGUN_API_KEY!;
  const domain = process.env.MAILGUN_DOMAIN!;
  const from = process.env.EMAIL_FROM!;

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", to);
  body.set("subject", subject);
  body.set("text", text);
  body.set("html", html);

  const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const errTxt = await resp.text().catch(() => "");
    throw new Error(`Mailgun send failed: ${resp.status} ${errTxt}`);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  // Persist sessions in Prisma so Studio shows them
  session: { strategy: "database" },

  useSecureCookies,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        const subject = "Sign in to JetSet Direct";
        const text = `Click the link to sign in:\n\n${url}\n\nThis link expires shortly.`;
        const html = `
          <p>Click the button below to sign in to <strong>JetSet Direct</strong>:</p>
          <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#0a1a2f;color:#fff;text-decoration:none;border-radius:6px">Sign in</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${url}">${url}</a></p>
        `;
        await sendWithMailgun(identifier, subject, text, html);
      },
    }),
  ],

  pages: { signIn: "/login" },

  callbacks: {
    // Keep redirects on our own origin
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        const base = new URL(baseUrl);
        return target.origin === base.origin ? target.toString() : base.toString();
      } catch {
        return baseUrl;
      }
    },

    // Keep id in the token if it exists (helps during transitions)
    async jwt({ token, user }) {
      if ((user as any)?.id) (token as any).sub = (user as any).id;
      return token;
    },

    // *** The fix: always attach user.id to the session ***
    async session({ session, user, token }) {
      const s: any = session;

      // 1) Database sessions provide `user`
      if ((user as any)?.id) {
        s.user.id = (user as any).id;
        return session;
      }

      // 2) If JWT exists, use its subject
      if (token?.sub) {
        s.user.id = token.sub as string;
        return session;
      }

      // 3) Final fallback: look up by email
      if (session.user?.email) {
        const u = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });
        if (u) s.user.id = u.id;
      }

      return session;
    },
  },
};

// Create route handler once, re-use in the route file
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export default handler;
