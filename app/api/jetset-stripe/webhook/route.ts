import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.arrayBuffer();
  const sig = (await headers()).get("stripe-signature");
  const secret = process.env.JETSET_STRIPE_WEBHOOK_SECRET!;
  try {
    const event = stripe.webhooks.constructEvent(Buffer.from(body), sig!, secret);
    // TODO: update DB on completed events
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return new NextResponse("Webhook Error", { status: 400 });
  }
}
