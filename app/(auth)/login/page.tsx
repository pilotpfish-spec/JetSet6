// app/(auth)/login/page.tsx
import Link from "next/link";

export default function LoginPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Sign in</h1>
      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <a href="/api/auth/signin/google" className="btn">Continue with Google</a>
        <a href="/api/auth/signin/email" className="btn">Email me a sign-in link</a>
        <a href="/api/auth/signin/credentials" className="btn">Use email + password</a>
        <p style={{ color: "#6b7280" }}>
          You’ll be returned to your account after signing in. <Link href="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
