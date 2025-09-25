// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Normalize base URL to avoid preview-domain OAuth mismatch
const isProd = !!process.env.VERCEL;
const defaultBase = isProd ? "https://jetsetdirect.com" : "http://localhost:3000";
const baseUrl = process.env.NEXTAUTH_URL || defaultBase;
const useSecureCookies = baseUrl.startsWith("https://");

// --- Mailgun helper ---
async function sendWithMailgun(to: string, subject: string, text: string, html: string) {
  const apiKey = process.env.MAILGUN_API_KEY!;
  const domain = process.env.MAILGUN_DOMAIN!;
  const from = process.env.EMAIL_FROM!;
  const body = new URLSearchParams();
  body.set("from", from); body.set("to", to);
  body.set("subject", subject); body.set("text", text); body.set("html", html);
  const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
               "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`Mailgun send failed: ${resp.status} ${await resp.text().catch(()=>"""")}`);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  // ✅ Persist sessions in Prisma (so Session rows appear)
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
          <p><a href="${url}">${url}</a></p>`;
        await sendWithMailgun(identifier, subject, text, html);
      },
    }),
  ],

  pages: { signIn: "/login" },

  callbacks: {
    async redirect({ url }) {
      // Force redirects to baseUrl to avoid preview-domain callback mismatch
      const base = new URL(baseUrl);
      const target = new URL(url, base);
      return target.origin === base.origin ? target.toString() : base.toString();
    },
    async jwt({ token, user }) { if (user) (token as any).id = (user as any).id; return token; },
    async session({ session, token }) { if (token?.id) (session.user as any).id = token.id as string; return session; },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export default handler;

