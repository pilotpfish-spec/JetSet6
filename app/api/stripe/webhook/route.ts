// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = (req.headers as any).get("stripe-signature") as string | null;

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;

  // Don’t crash the build if envs are missing; just no-op at runtime.
  if (!secret || !key) {
    console.error("Stripe webhook not configured (missing STRIPE_WEBHOOK_SECRET or key)");
    return new NextResponse(null, { status: 200 }); // ack to avoid retries while you wire envs
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, secret);
  } catch (err: any) {
    console.error("Webhook signature verify failed:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const bookingId = session?.metadata?.bookingId as string | undefined;

      // TODO: mark booking paid in DB (if you want to finalize here)
      // await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED", stripeId: session.id } })

      console.log("Checkout completed", { sessionId: session.id, bookingId });
    }

    return new NextResponse(null, { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

// Stripe sends JSON but we must read the raw body for signature verification.
// Next.js already provides the raw text via req.text(), so no extra body parser config needed here.
