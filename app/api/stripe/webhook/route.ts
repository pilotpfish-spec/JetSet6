import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  let event: Stripe.Event;
  try {
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature")!;
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error("[webhook] signature verify failed:", err?.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = (session.metadata?.bookingId ?? "").toString();
      const amountTotal = session.amount_total ?? 0;

      // TODO: mark booking as paid in your DB using bookingId
      console.log("[webhook] paid:", { bookingId, amountTotal, sessionId: session.id });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
