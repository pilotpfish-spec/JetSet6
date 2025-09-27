import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const dynamic = "force-dynamic"; // always revalidate
export const runtime = "nodejs";        // ensure Node runtime

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");

  let rawBody: string;
  try {
    rawBody = await req.text(); // IMPORTANT: raw body required for signature verification
  } catch (err) {
    console.error("❌ Failed to read raw body:", err);
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("✅ Webhook verified:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.client_reference_id) {
        await prisma.booking.update({
          where: { id: session.client_reference_id },
          data: { status: "PAID" },
        });
        console.log("✅ Booking marked as PAID:", session.client_reference_id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
