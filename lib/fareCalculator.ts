export interface FareResult {
  distance: number;
  minutes: number;
  bracket: string;
  base: number;
  perMileRate: number;
  extraMiles: number;
  extraCharge: number;
  trafficSurcharge: number;
  total: number;
}

/**
 * Calculates fare using both distance and duration (traffic-aware).
 */
export function calculateFare(distance: number, minutes: number): FareResult {
  let bracket = "";
  let base = 0;
  let perMileRate = 0;
  let cutoff = 0;

  if (distance <= 5) {
    bracket = "0–5 miles";
    base = 25;
    perMileRate = 2.0;
    cutoff = 5;
  } else if (distance <= 10) {
    bracket = "6–10 miles";
    base = 35;
    perMileRate = 1.75;
    cutoff = 10;
  } else if (distance <= 20) {
    bracket = "11–20 miles";
    base = 45;
    perMileRate = 1.5;
    cutoff = 20;
  } else if (distance <= 30) {
    bracket = "21–30 miles";
    base = 55;
    perMileRate = 1.25;
    cutoff = 30;
  } else if (distance <= 60) {
    bracket = "31–60 miles";
    base = 75;
    perMileRate = 1.0;
    cutoff = 60;
  } else if (distance <= 100) {
    bracket = "61–100 miles";
    base = 120;
    perMileRate = 1.0;
    cutoff = 100;
  } else if (distance <= 150) {
    bracket = "101–150 miles";
    base = 180;
    perMileRate = 2.0;
    cutoff = 150;
  } else if (distance <= 200) {
    bracket = "151–200 miles";
    base = 280;
    perMileRate = 2.25;
    cutoff = 200;
  } else if (distance <= 300) {
    bracket = "201–300 miles";
    base = 400;
    perMileRate = 2.5;
    cutoff = 300;
  } else if (distance <= 500) {
    bracket = "301–500 miles";
    base = 900;
    perMileRate = 2.5;
    cutoff = 500;
  } else {
    bracket = "501–1,000 miles";
    base = 1650;
    perMileRate = 3.0;
    cutoff = 1000;
  }

  const extraMiles = Math.max(distance - cutoff, 0);
  const extraCharge = extraMiles * perMileRate;

  // ✅ Traffic surcharge: add $0.25/min after first 20 minutes
  const trafficSurcharge = minutes > 20 ? (minutes - 20) * 0.25 : 0;

  const total = base + extraCharge + trafficSurcharge;

  return {
    distance,
    minutes,
    bracket,
    base,
    perMileRate,
    extraMiles,
    extraCharge,
    trafficSurcharge,
    total,
  };
}
