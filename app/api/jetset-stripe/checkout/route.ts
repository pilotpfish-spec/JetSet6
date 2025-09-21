import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: process.env.JETSET_STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: process.env.NEXT_PUBLIC_SITE_URL + "/?paid=1",
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + "/?canceled=1",
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "stripe error" }, { status: 500 });
  }
}
