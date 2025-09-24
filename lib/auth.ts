// /lib/auth.ts
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// ---- Prisma client (safe for Vercel hot reload) ----------------------------
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ---- Helpers ---------------------------------------------------------------
const isHttps = (url?: string) => (url ?? "").startsWith("https://");
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ---- Mailgun (no extra deps) ----------------------------------------------
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

// ---- NextAuth config -------------------------------------------------------
export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  // keep cookies secure in prod
  useSecureCookies: isHttps(baseUrl),

  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // lets users link email+google same address
    }),

    // Email magic-link (no password; uses Mailgun)
    Email({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        const subject = "Sign in to JetSet Direct";
        const text = `Click the link to sign in:\n\n${url}\n\nThis link will expire soon.`;
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

  // Force redirects to your own origin; avoids redirect_uri mismatch silliness
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        if (target.origin !== new URL(baseUrl).origin) return baseUrl;
        return target.toString();
      } catch {
        return baseUrl;
      }
    },
    async session({ session, token }) {
      if (token?.sub) (session.user as any).id = token.sub;
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },

  pages: {
    signIn: "/login", // your existing page
  },
};

// Export handler for the Route Handler to import
export const { handlers, auth } = NextAuth(authOptions);

};
