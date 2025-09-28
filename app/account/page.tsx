"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
};

type Invoice = {
  id: string;
  status: string;
  amountDue: number;
};

type Booking = {
  id: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  airport: string | null;
  terminal: string | null;
  scheduledAt: string;
  priceCents: number;
  status: string;
  invoice?: Invoice | null;
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

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add address form state
  const [newLabel, setNewLabel] = useState("");
  const [newLine1, setNewLine1] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/bookings?includeInvoice=1").then((r) => r.json()),
      fetch("/api/addresses").then((r) => r.json()),
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
    setBookings((b) =>
      b.map((bk) =>
        bk.id === id ? { ...bk, status: "CANCELLED" } : bk
      )
    );
  }

  async function deleteAddress(id: string) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setAddresses((a) => a.filter((addr) => addr.id !== id));
  }

  async function addAddress() {
    if (!newLine1.trim()) {
      alert("Please enter an address");
      return;
    }
    setSavingAddress(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel || "Saved Address",
          line1: newLine1,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(txt || "Failed to save address");
        return;
      }

      const addr = await res.json();
      setAddresses((prev) => [addr, ...prev]);
      setNewLabel("");
      setNewLine1("");
    } catch (e) {
      console.error("Add address failed", e);
      alert("Failed to save address");
    } finally {
      setSavingAddress(false);
    }
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
        {bookings.map((b) => {
          const isCancelled = b.status === "CANCELLED";
          return (
            <div key={b.id} className="mb-3 border-b pb-2">
              <p className="font-medium">
                {b.pickupAddress || "Unknown Pickup"} →{" "}
                {b.dropoffAddress || "Unknown Dropoff"}
              </p>
              {(b.airport || b.terminal) && (
                <p className="text-sm text-gray-700">
                  {b.airport ? `Airport: ${b.airport}` : ""}
                  {b.terminal ? ` — Terminal: ${b.terminal}` : ""}
                </p>
              )}
              <p className="text-sm text-gray-600">
                {new Date(b.scheduledAt).toLocaleString()} — $
                {(b.priceCents / 100).toFixed(2)}
              </p>
              <p
                className={`text-sm font-semibold ${
                  isCancelled ? "text-red-600" : ""
                }`}
              >
                Status: {b.status}
              </p>

              {/* Invoice details */}
              {b.invoice ? (
                <div className="text-sm mt-1">
                  <p>
                    Invoice:{" "}
                    <span
                      className={
                        b.invoice.status === "PAID"
                          ? "text-green-600 font-bold"
                          : b.invoice.status === "FAILED"
                          ? "text-red-600 font-bold"
                          : "text-yellow-600 font-bold"
                      }
                    >
                      {b.invoice.status}
                    </span>
                  </p>
                  <p>Amount: ${(b.invoice.amountDue / 100).toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No invoice yet</p>
              )}

              {!isCancelled && (
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
              )}
            </div>
          );
        })}
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

        {/* Inline add form */}
        <div className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Label (e.g. Home, Office)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          <input
            type="text"
            placeholder="Street, City, State Zip"
            value={newLine1}
            onChange={(e) => setNewLine1(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          <button
            onClick={addAddress}
            disabled={savingAddress}
            className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingAddress ? "Saving…" : "Add Address"}
          </button>
        </div>
      </div>
    </div>
  );
}

