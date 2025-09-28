// app/quote/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

const JETSET_NAVY = "#0a1a2f";
const JETSET_YELLOW = "#FFD700";

function calcFareCents(miles: number): number {
  const base = 45; // USD
  const extraMiles = Math.max(0, miles - 20);
  const extra = extraMiles * 1.5; // USD per mile
  const total = base + extra;
  return Math.round(total * 100);
}

export default function QuotePage() {
  const sp = useSearchParams();
  const router = useRouter();

  const distance = Number(sp.get("distance") || "0");
  const minutes = Number(sp.get("minutes") || "0");
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const airport = sp.get("airport") || "";
  const terminal = sp.get("terminal") || "";
  const dateIso = sp.get("dateIso") || "";

  const cents = useMemo(() => {
    if (Number.isFinite(distance) && distance > 0) return calcFareCents(distance);
    return 4500; // fallback
  }, [distance]);

  const [email, setEmail] = useState("");
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const pretty = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "—");

  async function bookNowPayNow() {
    setStartingCheckout(true);
    try {
      const payload = {
        unitAmount: cents,
        email: email || undefined,
        bookingId: crypto.randomUUID(),
        metadata: {
          distance: distance.toString(),
          minutes: minutes.toString(),
          from,
          to,
          airport,
          terminal,
          dateIso,
        },
        // after successful payment, land on Account
        successPath: "/account?paid=1",
        cancelPath: `/quote?distance=${distance}&minutes=${minutes}&from=${encodeURIComponent(
          from
        )}&to=${encodeURIComponent(to)}&airport=${airport}&terminal=${terminal}&dateIso=${dateIso}`,
      };

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to start checkout.");
        setStartingCheckout(false);
        return;
      }
      if (!data?.url) {
        alert("Checkout URL missing.");
        setStartingCheckout(false);
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message || "Failed to start checkout.");
      setStartingCheckout(false);
    }
  }

  async function bookNowPayLater() {
    if (!email) {
      alert("Enter an email so we can send the invoice.");
      return;
    }
    setCreatingInvoice(true);
    try {
      const payload = {
        unitAmount: cents,
        email,
        bookingId: crypto.randomUUID(),
        metadata: {
          distance: distance.toString(),
          minutes: minutes.toString(),
          from,
          to,
          airport,
          terminal,
          dateIso,
        },
        daysUntilDue: 3,
      };

      const res = await fetch("/api/stripe/invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to create invoice.");
        setCreatingInvoice(false);
        return;
      }
      if (!data?.hostedInvoiceUrl) {
        alert("Invoice URL missing.");
        setCreatingInvoice(false);
        return;
      }
      // Open the hosted invoice
      window.location.href = data.hostedInvoiceUrl;
    } catch (e: any) {
      alert(e?.message || "Failed to create invoice.");
      setCreatingInvoice(false);
    }
  }

  return (
    <main className="flex justify-center items-start py-10 px-4">
      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: JETSET_NAVY }}>
          Quote
        </h1>

        <div className="space-y-2 text-sm">
          <div><strong>Estimated Fare:</strong> ${(cents / 100).toFixed(2)}</div>
          <div><strong>Distance:</strong> {pretty(distance)} miles</div>
          <div><strong>Duration (with traffic):</strong> {Number.isFinite(minutes) ? Math.round(minutes) : "—"} minutes</div>
          <div><strong>Base:</strong> $45</div>
          <div><strong>Extra:</strong> {distance > 20 ? `${(distance - 20).toFixed(1)} × $1.50` : "0.0 × $1.50"}</div>
          {airport && (
            <>
              <div><strong>Airport:</strong> {airport}</div>
              {terminal && <div><strong>Terminal:</strong> {terminal}</div>}
            </>
          )}
          <div><strong>Pickup:</strong> {from || "—"}</div>
          <div><strong>Drop-off:</strong> {to || "—"}</div>
          <div><strong>Date/Time:</strong> {dateIso || "—"}</div>
        </div>

        <div className="mt-4">
          <label className="block mb-1 font-medium">Email for receipt / invoice</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="you@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            For “Pay Later”, we’ll email you a secure Stripe invoice link.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={bookNowPayNow}
            disabled={startingCheckout}
            className="px-6 py-2 rounded font-semibold disabled:opacity-70"
            style={{ backgroundColor: JETSET_YELLOW, color: JETSET_NAVY }}
          >
            {startingCheckout ? "Starting Checkout..." : "Book Now (Pay Now)"}
          </button>

          <button
            onClick={bookNowPayLater}
            disabled={creatingInvoice}
            className="px-6 py-2 rounded font-semibold disabled:opacity-70"
            style={{ backgroundColor: JETSET_NAVY, color: "#fff" }}
          >
            {creatingInvoice ? "Creating Invoice..." : "Book Now — Pay Later"}
          </button>

          <button
            onClick={() => router.push("/booking")}
            className="px-6 py-2 rounded font-semibold border"
          >
            Back to Booking
          </button>
        </div>
      </section>
    </main>
  );
}
