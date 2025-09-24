// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // don't cache this route

const stripeKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jetsetdirect.com";

if (!stripeKey) {
  // Log once when the function is cold-started
  console.error("[Stripe] STRIPE_SECRET_KEY is missing in env");
}

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2024-06-20" })
  : null;

export async function POST(req: Request) {
  try {
    if (!stripe) {
      throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");
    }

    const body = await req.json().catch(() => ({} as any));
    const { priceId, unitAmount, bookingId, email } = body || {};

    // You must provide either a priceId OR a unitAmount (>= 50 cents)
    const hasValidUnitAmount =
      Number.isInteger(unitAmount) && Number(unitAmount) >= 50;

    if (!priceId && !hasValidUnitAmount) {
      throw new Error("Missing priceId or unitAmount (>= 50 cents).");
    }

    const lineItems =
      priceId
        ? [{ price: String(priceId), quantity: 1 }]
        : [{
            price_data: {
              currency: "usd",
              unit_amount: Number(unitAmount),
              product_data: { name: "JetSet Direct Ride" },
            },
            quantity: 1,
          }];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: lineItems,
      metadata: {
        bookingId: bookingId || "",
        env: process.env.VERCEL_ENV || "unknown",
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/quote?canceled=1`,
    });

    if (!session.url) {
      throw new Error("Stripe returned no checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    // Full error in server logs
    console.error("[/api/stripe/checkout] ERROR:", err);

    // Human-readable message back to browser
    const msg =
      err?.raw?.message || // Stripe error object shape
      err?.message ||
      "Checkout failed";

    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
