"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const JETSET_NAVY = "#0a1a2f";
const JETSET_YELLOW = "#FFD700";

// Fare logic (same as booking page)
function calcFareCents(miles: number): number {
  const base = 45; // USD
  const extraMiles = Math.max(0, miles - 20);
  const extra = extraMiles * 1.5;
  return Math.round((base + extra) * 100);
}

export default function QuoteClient() {
  const search = useSearchParams();
  const router = useRouter();

  const miles = Number(search.get("distance") ?? "");
  const minutes = Number(search.get("minutes") ?? "");
  const pickupAddress = (search.get("from") || "").trim();
  const dropoffAddress = (search.get("to") || "").trim();
  const airport = (search.get("airport") || "").trim();
  const terminal = (search.get("terminal") || "").trim();
  const dateIso = (search.get("dateIso") || "").trim();

  const valid = Number.isFinite(miles);
  const cents = useMemo(() => (valid ? calcFareCents(miles) : 0), [valid, miles]);
  const dollars = useMemo(() => (cents / 100).toFixed(2), [cents]);

  const [email, setEmail] = useState<string>("");
  const [loadingPayNow, setLoadingPayNow] = useState(false);
  const [loadingPayLater, setLoadingPayLater] = useState(false);

  // Cache quote in case of reload
  useEffect(() => {
    if (valid) {
      try {
        sessionStorage.setItem("JETSET_QUOTE_TOTAL_CENTS", String(cents));
      } catch {}
    }
  }, [valid, cents]);

  // Always persist booking before pay now/pay later
  async function createBooking() {
    const res = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pickupAddress,
        dropoffAddress,
        scheduledAt: dateIso || new Date().toISOString(),
        priceCents: cents,
        notes: "Created from quote flow",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.bookingId) throw new Error(data.error || "Failed to create booking");
    return data.bookingId as string;
  }

  async function handleBookNow() {
    if (!valid) return;
    setLoadingPayNow(true);

    try {
      const bookingId = await createBooking();

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unitAmount: cents,
          bookingId,
          email: email || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error("Stripe checkout failed");

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message || "Unexpected error during checkout.");
    } finally {
      setLoadingPayNow(false);
    }
  }

  async function handleBookNowPayLater() {
    if (!valid) return;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert("Please enter a valid email to receive your invoice.");
      return;
    }

    setLoadingPayLater(true);

    try {
      const bookingId = await createBooking();

      const invRes = await fetch("/api/stripe/invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unitAmount: cents,
          email,
          bookingId,
          description: "JetSet Ride — Pay Later",
          daysUntilDue: 7,
          dateIso: dateIso || new Date().toISOString(),
          pickupAddress,
          dropoffAddress,
          airport,
          terminal,
        }),
      });

      const inv = await invRes.json();
      if (!invRes.ok || !inv?.url) throw new Error("Failed to create invoice");

      // Fire-and-forget confirmation email
      fetch("/api/mailgun/bookLater", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toEmail: email,
          invoiceUrl: inv.url,
          bookingId,
          fareCents: cents,
          pickupAddress,
          dropoffAddress,
          dateIso: dateIso || new Date().toISOString(),
        }),
      }).catch(() => {});

      window.open(inv.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message || "Unexpected error creating invoice.");
    } finally {
      setLoadingPayLater(false);
    }
  }

  if (!valid) {
    return (
      <main className="flex justify-center items-start py-10 px-4">
        <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-3" style={{ color: JETSET_NAVY }}>
            Quote Error
          </h2>
          <p>Missing trip details. Please return to the booking page and try again.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex justify-center items-start py-10 px-4">
      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: JETSET_NAVY }}>
          Your Quote
        </h1>

        <div className="space-y-2">
          <p><strong>Estimated Fare:</strong> ${dollars}</p>
          <p><strong>Distance:</strong> {miles.toFixed(1)} miles</p>
          {Number.isFinite(minutes) && (
            <p><strong>Duration (with traffic):</strong> {minutes} minutes</p>
          )}
          <p><strong>Base:</strong> $45</p>
          <p><strong>Extra:</strong> {Math.max(0, miles - 20).toFixed(1)} × $1.50</p>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-1" style={{ color: JETSET_NAVY }}>
            Email for receipt / invoice
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="you@example.com"
            className="w-full rounded border px-3 py-2"
          />
          <p className="mt-1 text-xs opacity-70">
            For “Pay Later”, we’ll email you a secure Stripe invoice link.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleBookNow}
            disabled={loadingPayNow}
            className="px-6 py-2 rounded font-semibold disabled:opacity-60"
            style={{ backgroundColor: JETSET_YELLOW, color: JETSET_NAVY }}
          >
            {loadingPayNow ? "Starting Checkout…" : "Book Now (Pay Now)"}
          </button>

          <button
            onClick={handleBookNowPayLater}
            disabled={loadingPayLater}
            className="px-6 py-2 rounded font-semibold disabled:opacity-60"
            style={{ backgroundColor: JETSET_NAVY, color: "#fff" }}
          >
            {loadingPayLater ? "Creating Invoice…" : "Book Now — Pay Later"}
          </button>

          <button
            onClick={() => router.push("/booking")}
            className="px-6 py-2 rounded font-semibold border"
            style={{ color: JETSET_NAVY, borderColor: JETSET_NAVY }}
          >
            Back to Booking
          </button>
        </div>
      </section>
    </main>
  );
}
