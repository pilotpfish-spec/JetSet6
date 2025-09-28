"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google: any;
    initJetSetPlaces?: () => void;
  }
}

type TripType = "to" | "from" | "non";
type AirportCode = "DFW" | "DAL";

const JETSET_NAVY = "#0a1a2f";
const JETSET_YELLOW = "#FFD700";

// ✅ Coordinates for airports and terminals
const TERMINALS: Record<string, { name: string; lat: number; lng: number }> = {
  "DFW-A": { name: "DFW Terminal A", lat: 32.8998, lng: -97.0403 },
  "DFW-B": { name: "DFW Terminal B", lat: 32.899, lng: -97.0526 },
  "DFW-C": { name: "DFW Terminal C", lat: 32.8968, lng: -97.037 },
  "DFW-D": { name: "DFW Terminal D", lat: 32.8975, lng: -97.0404 },
  "DFW-E": { name: "DFW Terminal E", lat: 32.9011, lng: -97.0425 },
  "DFW-Rental": { name: "DFW Rental Car Return", lat: 32.8626, lng: -97.037 },
  DAL: { name: "Dallas Love Field", lat: 32.8471, lng: -96.8517 },
};

// --- tiny fare helper so we always have a number to send to Stripe ---
function calcFareCents(miles: number): number {
  const base = 45; // USD
  const extraMiles = Math.max(0, miles - 20);
  const extra = extraMiles * 1.5; // USD per mile
  const total = base + extra; // traffic surcharge currently 0
  return Math.round(total * 100);
}

function AddressAutocomplete(props: {
  id: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
  onConfirmed: (payload: {
    formatted: string;
    latLng?: { lat: number; lng: number };
  }) => void;
}) {
  const { id, label, placeholder = "Start typing…", disabled, initialValue, onConfirmed } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!window.google?.maps?.places) return;

    if (!autocompleteRef.current) {
      const ac = new window.google.maps.places.Autocomplete(el, {
        types: ["address"],
        componentRestrictions: { country: "us" },
      });
      autocompleteRef.current = ac;

      ac.addListener("place_changed", async () => {
        const place = ac.getPlace();
        if (!place) return;

        const formatted: string = place.formatted_address || place.name || el.value;
        setValue(formatted);

        let latLng: { lat: number; lng: number } | undefined;
        if (place.geometry?.location) {
          latLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
        }
        onConfirmed({ formatted, latLng });
      });

      const handleEnter = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          const first = document.querySelector<HTMLElement>(".pac-item");
          if (first) {
            e.preventDefault();
            first.click();
          }
        }
      };
      el.addEventListener("keydown", handleEnter);
      return () => {
        el.removeEventListener("keydown", handleEnter);
      };
    }
  }, [id, disabled]);

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block mb-1 font-medium">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded"
        autoComplete="off"
      />
    </div>
  );
}

export default function BookingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [googleReady, setGoogleReady] = useState(false);
  const [tripType, setTripType] = useState<TripType>("to");
  const [airport, setAirport] = useState<AirportCode>("DFW");
  const [terminal, setTerminal] = useState<string>("DFW-A");
  const [pickup, setPickup] = useState<{ formatted?: string; latLng?: { lat: number; lng: number } } | null>(null);
  const [dropoff, setDropoff] = useState<{ formatted?: string; latLng?: { lat: number; lng: number } } | null>(null);
  const [rideDate, setRideDate] = useState<string>("");
  const [rideTime, setRideTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [quoteReady, setQuoteReady] = useState<boolean>(false);

  useEffect(() => {
    window.initJetSetPlaces = () => {
      if (window.google?.maps?.places) {
        setGoogleReady(true);
      }
    };
    if (window.google?.maps?.places) {
      setGoogleReady(true);
    }
  }, []);

  const onGoogleLoad = () => {
    if (window.google?.maps?.places) {
      setGoogleReady(true);
    }
  };

  const validateForQuote = (): string | null => {
    if (!rideDate || !rideTime) return "Please select date and time.";
    if (tripType === "to") {
      if (!pickup?.latLng) return "Please choose a pickup address.";
    } else if (tripType === "from") {
      if (!dropoff?.latLng) return "Please choose a drop-off address.";
    } else {
      if (!pickup?.latLng) return "Please choose a pickup address.";
      if (!dropoff?.latLng) return "Please choose a drop-off address.";
    }
    return null;
  };

  // Build origin/destination based on tripType
  const getOD = () => {
    let origin: any;
    let destination: any;

    if (tripType === "to") {
      origin = pickup?.latLng ?? {};
      destination = airport === "DFW" ? TERMINALS[terminal] : TERMINALS["DAL"];
    } else if (tripType === "from") {
      origin = airport === "DFW" ? TERMINALS[terminal] : TERMINALS["DAL"];
      destination = dropoff?.latLng ?? {};
    } else {
      origin = pickup?.latLng ?? {};
      destination = dropoff?.latLng ?? {};
    }
    return { origin, destination };
  };

  // Compute miles & minutes (used for quote + fallback fare for Stripe)
  async function computeTripStats(): Promise<{ miles: number; minutes: number } | null> {
    if (!window.google?.maps?.DistanceMatrixService) return null;

    const { origin, destination } = getOD();
    const departureDateTime = new Date(`${rideDate}T${rideTime}:00`);

    return new Promise((resolve) => {
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
          drivingOptions: {
            departureTime: departureDateTime,
            trafficModel: "bestguess",
          },
        },
        (response: any, status: string) => {
          if (status !== "OK") {
            resolve(null);
            return;
          }
          try {
            const elem = response.rows[0].elements[0];
            const meters = elem.distance.value;
            const miles = meters / 1609.34;
            const seconds = (elem.duration_in_traffic ?? elem.duration).value;
            const minutes = seconds / 60;
            resolve({ miles, minutes });
          } catch {
            resolve(null);
          }
        }
      );
    });
  }

  const handleQuote = async () => {
    const problem = validateForQuote();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setQuoteReady(true);

    const stats = await computeTripStats();
    if (!stats) {
      setError("Error fetching distance from Google.");
      return;
    }

    const { miles, minutes } = stats;
    const cents = calcFareCents(miles);
    try {
      sessionStorage.setItem("JETSET_QUOTE_TOTAL_CENTS", String(cents));
    } catch {}

    // ✅ include full trip context in query string
    const params = new URLSearchParams({
      distance: miles.toFixed(1),
      minutes: minutes.toFixed(0),
      from: pickup?.formatted || "",
      to: dropoff?.formatted || "",
      airport,
      terminal,
      dateIso: `${rideDate}T${rideTime}:00`,
    });

    router.push(`/quote?${params.toString()}`);
  };

  // --- Stripe call + redirect (Confirm Booking) ---
  async function handleBookNow() {
    if (!session) {
      signIn();
      return;
    }

    let unitAmount = 4500; // default to $45
    try {
      const stored = sessionStorage.getItem("JETSET_QUOTE_TOTAL_CENTS");
      if (stored && !Number.isNaN(Number(stored))) {
        unitAmount = Number(stored);
      } else {
        const stats = await computeTripStats();
        if (stats) unitAmount = calcFareCents(stats.miles);
      }
    } catch {
      const stats = await computeTripStats();
      if (stats) unitAmount = calcFareCents(stats.miles);
    }

    const payload = {
      unitAmount,
      bookingId: "temp-id-123",
      email: session?.user?.email ?? undefined,
    };

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Could not start checkout.");
      return;
    }

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout URL missing.");
    }
  }

  const AirportFields = () => (
    <>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Airport</label>
        <select
          value={airport}
          onChange={(e) => setAirport(e.target.value as AirportCode)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="DFW">DFW Airport</option>
          <option value="DAL">Dallas Love Field</option>
        </select>
      </div>

      {airport === "DFW" && (
        <div className="mb-4">
          <label className="block mb-1 font-medium">Select Terminal</label>
          <select
            value={terminal}
            onChange={(e) => setTerminal(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="DFW-A">Terminal A</option>
            <option value="DFW-B">Terminal B</option>
            <option value="DFW-C">Terminal C</option>
            <option value="DFW-D">Terminal D</option>
            <option value="DFW-E">Terminal E</option>
            <option value="DFW-Rental">Rental Car Return</option>
          </select>
        </div>
      )}
    </>
  );

  return (
    <>
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
        }&libraries=places&callback=initJetSetPlaces`}
        strategy="afterInteractive"
        onLoad={onGoogleLoad}
        onReady={onGoogleLoad}
      />

      <main className="flex justify-center items-start py-10 px-4">
        <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-center mb-6" style={{ color: JETSET_NAVY }}>
            Ground Service Elevated
          </h1>

          {/* Trip Type */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              className={`px-4 py-2 rounded ${tripType === "to" ? "text-white" : ""}`}
              style={{
                backgroundColor: tripType === "to" ? JETSET_NAVY : "#e5e7eb",
                color: tripType === "to" ? "#fff" : "#374151",
              }}
              onClick={() => setTripType("to")}
            >
              To Airport
            </button>
            <button
              className={`px-4 py-2 rounded ${tripType === "from" ? "text-white" : ""}`}
              style={{
                backgroundColor: tripType === "from" ? JETSET_NAVY : "#e5e7eb",
                color: tripType === "from" ? "#fff" : "#374151",
              }}
              onClick={() => setTripType("from")}
            >
              From Airport
            </button>
            <button
              className={`px-4 py-2 rounded ${tripType === "non" ? "text-white" : ""}`}
              style={{
                backgroundColor: tripType === "non" ? JETSET_NAVY : "#e5e7eb",
                color: tripType === "non" ? "#fff" : "#374151",
              }}
              onClick={() => setTripType("non")}
            >
              Non-Airport
            </button>
          </div>

          {/* Date + Time */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Select Date</label>
            <input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Select Time</label>
            <input
              type="time"
              value={rideTime}
              onChange={(e) => setRideTime(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {tripType === "to" && (
            <>
              <AddressAutocomplete
                id="pickup"
                label="Pickup Address"
                placeholder={googleReady ? "Start typing…" : "Loading Google…"}
                disabled={!googleReady}
                onConfirmed={(p) => setPickup({ formatted: p.formatted, latLng: p.latLng })}
              />
              <AirportFields />
            </>
          )}

          {tripType === "from" && (
            <>
              <AirportFields />
              <AddressAutocomplete
                id="dropoff"
                label="Drop-off Address"
                placeholder={googleReady ? "Start typing…" : "Loading Google…"}
                disabled={!googleReady}
                onConfirmed={(p) => setDropoff({ formatted: p.formatted, latLng: p.latLng })}
              />
            </>
          )}

          {tripType === "non" && (
            <>
              <AddressAutocomplete
                id="pickup-non"
                label="Pickup Address"
                placeholder={googleReady ? "Start typing…" : "Loading Google…"}
                disabled={!googleReady}
                onConfirmed={(p) => setPickup({ formatted: p.formatted, latLng: p.latLng })}
              />
              <AddressAutocomplete
                id="dropoff-non"
                label="Drop-off Address"
                placeholder={googleReady ? "Start typing…" : "Loading Google…"}
                disabled={!googleReady}
                onConfirmed={(p) => setDropoff({ formatted: p.formatted, latLng: p.latLng })}
              />
            </>
          )}

          {error && <p className="text-sm mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleQuote}
              className="px-6 py-2 rounded font-semibold"
              style={{ backgroundColor: JETSET_YELLOW, color: JETSET_NAVY }}
            >
              Get Quote
            </button>

            {quoteReady && (
              <button
                onClick={handleBookNow}
                className="px-6 py-2 rounded font-semibold"
                style={{ backgroundColor: JETSET_NAVY, color: "#fff" }}
              >
                Confirm Booking
              </button>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
