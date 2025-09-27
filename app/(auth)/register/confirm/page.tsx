// C:\JetSetNew6\app\(auth)\register\confirm\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Confirming…");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/register/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Invalid/Expired link");
        setStatus("ok");
        setMessage("Email confirmed! Redirecting…");
        setTimeout(() => {
          router.replace(`/register/set-password?pt=${encodeURIComponent(data.pt)}`);
        }, 800);
      } catch (e: any) {
        setStatus("error");
        setMessage(e.message || "Could not confirm email.");
      }
    })();
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow text-center">
        <h1 className="text-2xl font-bold mb-2">Confirm Email</h1>
        <p className={status === "error" ? "text-red-600" : "text-gray-700"}>{message}</p>
      </div>
    </div>
  );
}
