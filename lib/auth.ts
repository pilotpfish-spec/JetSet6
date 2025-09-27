// C:\JetSetNew6\lib\auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

const isProd = !!process.env.VERCEL;
const DEFAULT_BASE = isProd ? "https://jetsetdirect.com" : "http://localhost:3000";
export const BASE_URL = (process.env.NEXTAUTH_URL || DEFAULT_BASE).trim();

// --- Mailgun helper ---
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
  session: { strategy: "database" },

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
          <p>Click below to sign in to <strong>JetSet Direct</strong>:</p>
          <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#0a1a2f;color:#fff;text-decoration:none;border-radius:6px">Sign in</a></p>
          <p>Or paste this into your browser:</p>
          <p><a href="${url}">${url}</a></p>
        `;
        await sendWithMailgun(identifier, subject, text, html);
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });

        // ✅ use the `password` column only
        if (!user?.password) return null;
        const ok = await compare(creds.password, user.password);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async redirect({ url }) {
      try {
        const base = new URL(BASE_URL);
        const target = new URL(url, base);
        return target.origin === base.origin ? target.toString() : base.toString();
      } catch {
        return BASE_URL;
      }
    },
    async session({ session, user }) {
      if (user?.id) (session.user as any).id = user.id;
      return session;
    },
  },
};
