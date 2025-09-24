import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(key, {
  apiVersion: "2024-06-20",
});

export function getBaseUrl(): string {
  const a = process.env.NEXT_PUBLIC_APP_URL;
  const b = process.env.NEXTAUTH_URL;
  const base = (a || b || "http://localhost:3000").replace(/\/$/, "");
  return base;
}
