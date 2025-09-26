"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // TODO: wire up your register API endpoint
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to register");

      // Optionally sign them in immediately
      await signIn("credentials", {
        redirect: true,
        email: form.email,
        password: form.password,
        callbackUrl: "/account",
      });
    } catch {
      setError("Could not create account.");
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

        {error && <div className="text-center text-red-500">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={form.email}
            onChange={onChange("email")}
            placeholder="Email"
            className="w-full rounded border px-3 py-2"
          />
          <input
            type="password"
            required
            value={form.password}
            onChange={onChange("password")}
            placeholder="Password"
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gradient-to-r from-sky-500 to-pink-500 py-2 font-semibold text-white"
          >
            {loading ? "Creating..." : "Create Account"}
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
