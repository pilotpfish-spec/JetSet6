// C:\JetSetNew6\app\account\page.tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
};

type Booking = {
  id: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  scheduledAt: string;
  priceCents: number;
  status: string;
};

type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export default function AccountPage() {
  const { status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/bookings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/addresses", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([user, bookings, addresses]) => {
        setProfile(user);
        setBookings(bookings);
        setAddresses(addresses);
      })
      .catch(() => setError("Could not load account data."));
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Account</h1>
        <p className="mb-4">You’re not signed in.</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/account" })}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  async function cancelBooking(id: string) {
    await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    setBookings((b) => b.filter((bk) => bk.id !== id));
  }

  async function deleteAddress(id: string) {
    await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
    setAddresses((a) => a.filter((addr) => addr.id !== id));
  }

  return (
    <div className="p-8 space-y-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">My Account</h1>
      {error && <p className="text-red-500">{error}</p>}

      {/* Profile */}
      {profile && (
        <div className="rounded border p-4 shadow bg-white">
          <h2 className="text-lg font-semibold mb-2">Profile</h2>
          <p className="text-gray-800">{profile.name}</p>
          <p className="text-gray-600">{profile.email}</p>
        </div>
      )}

      {/* Bookings */}
      <div className="rounded border p-4 shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">Upcoming Bookings</h2>
        {bookings.length === 0 && <p>No bookings found.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="mb-3 border-b pb-2">
            <p className="font-medium">
              {b.pickupAddress} → {b.dropoffAddress}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(b.scheduledAt).toLocaleString()} — $
              {(b.priceCents / 100).toFixed(2)}
            </p>
            <p className="text-sm">Status: {b.status}</p>
            <div className="space-x-2 mt-1">
              <Link
                href={`/booking?modify=${b.id}`}
                className="rounded bg-yellow-500 px-2 py-1 text-white hover:opacity-90"
              >
                Modify
              </Link>
              <button
                onClick={() => cancelBooking(b.id)}
                className="rounded bg-red-600 px-2 py-1 text-white hover:opacity-90"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Saved Addresses */}
      <div className="rounded border p-4 shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">Saved Addresses</h2>
        {addresses.length === 0 && <p>No saved addresses.</p>}
        {addresses.map((a) => (
          <div key={a.id} className="mb-2 flex justify-between items-center">
            <span>
              {a.label}: {a.line1}, {a.city}, {a.state} {a.postalCode}
            </span>
            <button
              onClick={() => deleteAddress(a.id)}
              className="rounded bg-red-600 px-2 py-1 text-white hover:opacity-90"
            >
              Delete
            </button>
          </div>
        ))}
        <Link
          href="/booking"
          className="mt-2 inline-block rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
        >
          Add Address
        </Link>
      </div>
    </div>
  );
}


