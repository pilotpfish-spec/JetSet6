// lib/auth.ts

import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

// ⬇️ Robust import: supports both @auth/prisma-adapter and @next-auth/prisma-adapter
import * as PrismaAdapterPkg from "@auth/prisma-adapter";
// If the older package is still installed, Next may resolve that one; this keeps us safe.
const PrismaAdapterAny =
  (PrismaAdapterPkg as any).PrismaAdapter ??
  (PrismaAdapterPkg as any).default;

import { prisma } from "@/lib/prisma";

// -------- base URL / cookies --------
const isProd = !!process.env.VERCEL;
const defaultBase = isProd ? "https://jetsetdirect.com" : "http://localhost:3000";
const baseUrl = (process.env.NEXTAUTH_URL || defaultBase).trim();
const useSecureCookies = baseUrl.startsWith("https://");

// --- Mailgun helper (unchanged) ---
async function sendWithMailgun(to: string, subject: string, text: string, html: string) {
  const apiKey = process.env.MAILGUN_API_KEY!;
  const domain = process.env.MAILGUN_DOMAIN!;
  const from = process.env.EMAIL_FROM!;
  const body = new URLSearchParams();
  body.set("from", from); body.set("to", to);
  body.set("subject", subject); body.set("text", text); body.set("html", html);
  const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`Mailgun send failed: ${resp.status} ${msg}`);
  }
}

export const authOptions: NextAuthOptions = {
  // ✅ Use the adapter we resolved above
  adapter: PrismaAdapterAny(prisma) as any,

  // We want DB sessions (so they show in Prisma)
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

  // ✅ Make sure session.user.id is present for BOTH jwt & database strategies
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).id = (user as any).id;
      return token;
    },
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

// Route handler (unchanged)
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export default handler;
