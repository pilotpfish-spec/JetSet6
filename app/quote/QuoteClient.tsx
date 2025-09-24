"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const JETSET_NAVY = "#0a1a2f";
const JETSET_YELLOW = "#FFD700";

// Same fare logic as booking page
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
  const valid = Number.isFinite(miles);

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

  const cents = calcFareCents(miles);
  const dollars = (cents / 100).toFixed(2);

  // Make the amount available to checkout fallback
  useEffect(() => {
    try {
      sessionStorage.setItem("JETSET_QUOTE_TOTAL_CENTS", String(cents));
    } catch {}
  }, [cents]);

  async function handleBookNow() {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        unitAmount: cents,          // cents
        bookingId: "temp-id-123",   // replace when you persist bookings
        email: undefined,           // or pass session.user.email from a signed-in page
      }),
    });

    if (!res.ok) {
      alert("Could not start checkout.");
      return;
    }

    const data = await res.json();
    if (data?.url) window.location.href = data.url;
    else alert("Checkout URL missing.");
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

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleBookNow}
            className="px-6 py-2 rounded font-semibold"
            style={{ backgroundColor: JETSET_YELLOW, color: JETSET_NAVY }}
          >
            Book Now
          </button>

          <button
            onClick={() => router.push("/booking")}
            className="px-6 py-2 rounded font-semibold"
            style={{ backgroundColor: JETSET_NAVY, color: "#fff" }}
          >
            Back to Booking
          </button>
        </div>
      </section>
    </main>
  );
}
