// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { unitAmount, priceId, bookingId, email } = await req.json();

    const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
    if (!key) {
      console.error("Stripe key missing");
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof req.headers.get === "function" ? `${new URL(req.url).origin}` : "http://localhost:3000");

    const successUrl = `${origin}/checkout/success?bookingId=${encodeURIComponent(
      bookingId || ""
    )}`;
    const cancelUrl = `${origin}/booking`;

    let session;
    if (priceId) {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { bookingId: bookingId || "" },
      });
    } else {
      const cents = Number(unitAmount);
      if (!Number.isFinite(cents) || cents < 50) {
        return NextResponse.json({ error: "Invalid unitAmount" }, { status: 400 });
      }
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "JetSet Ride" },
              unit_amount: Math.round(cents),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { bookingId: bookingId || "" },
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err?.message || err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
