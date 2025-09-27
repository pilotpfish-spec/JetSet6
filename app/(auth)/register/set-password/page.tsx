"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const token = new URLSearchParams(window.location.search).get("pt");
    if (!token) {
      setStatus("Missing token.");
      return;
    }

    try {
      const res = await fetch("/api/register/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to set password.");
        return;
      }

      // ✅ Success — automatically sign in with the new password
      setStatus("Password set successfully. Signing you in...");
      setPassword("");

      const loginRes = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password,
        callbackUrl: "/account",
      });

      if (loginRes?.error) {
        setStatus("Password saved, but login failed. Please sign in manually.");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        router.push("/account");
      }
    } catch (err) {
      console.error("Error setting password:", err);
      setStatus("Unexpected error.");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Set Your Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save Password
        </button>
      </form>
      {status && <p className="mt-4 text-center text-sm">{status}</p>}
    </div>
  );
}
