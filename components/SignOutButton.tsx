"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      className="rounded px-3 py-1 border"
      onClick={() => signOut({ callbackUrl: "/" })}
      aria-label="Sign out"
      title="Sign out"
    >
      Sign out
    </button>
  );
}
