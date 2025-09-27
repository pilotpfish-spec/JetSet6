"use client";

import { useState } from "react";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const pt = new URLSearchParams(window.location.search).get("pt");
    if (!pt) {
      setStatus("Missing token.");
      return;
    }

    try {
      const res = await fetch("/api/register/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pt, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to set password.");
        return;
      }

      setStatus("Password set successfully. You can now sign in.");
      setPassword("");
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
