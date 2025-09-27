"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function SetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("pt"); // token passed as ?pt=

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing token");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to set password");
      }

      const data = await res.json().catch(() => ({}));
      const email = data?.email;
      if (!email) {
        throw new Error("No email returned from server");
      }

      // ✅ Create a NextAuth session, then land on /account
      const result = await signIn("credentials", {
        redirect: true,
        callbackUrl: "/account",
        email,
        password,
      });

      // If redirect=false, you could inspect result?.error, but we redirect on success above.
    } catch (err: any) {
      setError(err.message || "Failed to set password");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Set Your Password</h2>

        {/* New Password */}
        <div className="relative mb-4">
          <input
            type={show1 ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded w-full py-2 px-3 pr-10"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShow1((s) => !s)}
            className="absolute inset-y-0 right-2 flex items-center"
            aria-label={show1 ? "Hide password" : "Show password"}
          >
            {show1 ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative mb-4">
          <input
            type={show2 ? "text" : "password"}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border rounded w-full py-2 px-3 pr-10"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShow2((s) => !s)}
            className="absolute inset-y-0 right-2 flex items-center"
            aria-label={show2 ? "Hide password" : "Show password"}
          >
            {show2 ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded"
        >
          {submitting ? "Saving..." : "Save Password"}
        </button>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
}

}

