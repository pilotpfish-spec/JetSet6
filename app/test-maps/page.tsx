"use client";

import { useEffect } from "react";
import Script from "next/script";

export default function TestMapsPage() {
  useEffect(() => {
    const initAutocomplete = () => {
      const input = document.getElementById("test-address") as HTMLInputElement;
      if (!input || !window.google || !window.google.maps || !window.google.maps.places) {
        console.error("❌ Google Maps Places not ready");
        return;
      }
      console.log("✅ Google Maps Places loaded");

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "us" },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        console.log("📍 Selected place object:", place);
        alert(`You picked: ${place.formatted_address || "Unknown address"}`);
      });
    };

    if (window.google && window.google.maps) {
      initAutocomplete();
    } else {
      (window as any).initAutocomplete = initAutocomplete;
    }
  }, []);

  return (
    <>
      {/* Hardcoded script with callback */}
      <Script
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD0olHY1Nz9sHR0316nwtIRFZnmJba8W60&libraries=places&callback=initAutocomplete"
        strategy="beforeInteractive"
      />

      <div className="flex justify-center items-center py-20">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-xl font-bold mb-4 text-gray-900">
            Google Places Diagnostic
          </h1>

          <input
            id="test-address"
            placeholder="Type an address…"
            className="w-full px-3 py-2 border rounded"
          />

          <p className="mt-4 text-sm text-gray-600">
            Open DevTools → Console to see logs when you type or select a place.
          </p>
        </div>
      </div>
    </>
  );
}
