// C:\JetSetNew6\app\(auth)\register\page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send link");
      setMsg("Check your email for a confirmation link.");
    } catch (e: any) {
      setError(e.message || "Could not start registration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="JetSet Direct" className="mb-4 h-20 w-20" />
          <h1 className="text-2xl font-bold">Sign up</h1>
        </div>

        {msg && <div className="text-center text-green-600">{msg}</div>}
        {error && <div className="text-center text-red-500">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gradient-to-r from-sky-500 to-pink-500 py-2 font-semibold text-white"
          >
            {loading ? "Sending…" : "Email me a link"}
          </button>
        </form>

        <div className="flex items-center">
          <div className="h-px flex-grow bg-gray-300" />
          <span className="px-2 text-sm text-gray-500">or</span>
          <div className="h-px flex-grow bg-gray-300" />
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/account" })}
          className="flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-white py-2 font-medium hover:bg-gray-50"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
