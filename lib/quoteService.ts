// C:\JetSetNew6\lib\quoteService.ts

import { calculateFare, FareResult } from "./fareCalculator";

/**
 * Middleman service for quotes.
 * Takes distance in miles, runs the calculator, and returns the fare result.
 */
export function getQuote(distance: number): FareResult {
  return calculateFare(distance);
}
