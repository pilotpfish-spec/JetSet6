// C:\JetSetNew6\app\quote\page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { calculateFare } from "@/lib/fareCalculator";

export default function QuotePage() {
  const searchParams = useSearchParams();
  const distanceParam = searchParams.get("distance");
  const minutesParam = searchParams.get("minutes");

  if (!distanceParam || !minutesParam) {
    return (
      <main className="flex justify-center items-center py-10 px-4">
        <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl text-center">
          <h1 className="text-xl font-bold mb-4">Quote Error</h1>
          <p>Missing trip details. Please return to the booking page and try again.</p>
        </section>
      </main>
    );
  }

  const distance = parseFloat(distanceParam);
  const minutes = parseInt(minutesParam, 10);

  const fare = calculateFare(distance, minutes);

  return (
    <main className="flex justify-center items-start py-10 px-4">
      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: "#0a1a2f" }}>
          Your Quote
        </h1>

        <p><strong>Estimated Fare:</strong> ${fare.total.toFixed(2)}</p>
        <p><strong>Distance:</strong> {fare.distance.toFixed(1)} miles</p>
        <p><strong>Duration (with traffic):</strong> {fare.minutes} minutes</p>
        <p><strong>Bracket:</strong> {fare.bracket}</p>
        <p><strong>Base:</strong> ${fare.base}</p>
        <p>
          <strong>Extra:</strong> {fare.extraMiles.toFixed(1)} miles × ${fare.perMileRate.toFixed(2)} = ${fare.extraCharge.toFixed(2)}
        </p>
        <p>
          <strong>Traffic Surcharge:</strong> ${fare.trafficSurcharge.toFixed(2)}
        </p>

        <div className="mt-6">
          <button
            className="px-6 py-2 rounded font-semibold"
            style={{ backgroundColor: "#FFD700", color: "#0a1a2f" }}
            onClick={() => alert("Proceed to payment (Stripe integration pending)")}
          >
            Book Now
          </button>
        </div>
      </section>
    </main>
  );
}
