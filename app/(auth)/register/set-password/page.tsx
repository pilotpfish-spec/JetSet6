// C:\JetSetNew6\app\(auth)\register\set-password\page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pt = params.get("pt") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pt, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to set password");
      setMsg("Password saved! Signing you in…");
      // optional: auto sign-in via credentials (if configured)
      await signIn("credentials", {
        redirect: true,
        email: data.user.email,
        password,
        callbackUrl: "/account",
      });
    } catch (e: any) {
      setErr(e.message || "Could not set password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Choose a Password</h1>
          <p className="text-gray-600">Your email is verified. Create a password to finish.</p>
        </div>
        {msg && <div className="text-green-600 text-center">{msg}</div>}
        {err && <div className="text-red-600 text-center">{err}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading || !pt}
            className="w-full rounded bg-blue-600 py-2 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
