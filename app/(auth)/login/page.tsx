// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const callbackUrl = "/account";

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("email", { email, callbackUrl, redirect: false });
    if (res?.ok) setSent(true);
    else alert("Could not send sign-in link. Double-check your email.");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold text-center mb-6">Sign in</h1>

      {/* Google */}
      <button
        className="w-full rounded bg-black text-white py-2 mb-4"
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continue with Google
      </button>

      <div className="text-center text-sm text-gray-500 my-3">OR</div>

      {/* Email magic link */}
      {sent ? (
        <p className="text-center text-green-700">
          Check your email for the sign-in link.
        </p>
      ) : (
        <form onSubmit={handleEmail}>
          <input
            className="w-full border rounded px-3 py-2 mb-3"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="w-full rounded border py-2" type="submit">
            Email me a sign-in link
          </button>
        </form>
      )}
    </main>
  );
}
