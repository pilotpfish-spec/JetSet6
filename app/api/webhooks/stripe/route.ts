import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const sig = req.headers.get("stripe-signature")

    if (!sig) {
      return new NextResponse("Missing stripe-signature header", { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET in environment")
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message)
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    switch (event.type) {
      case "checkout.session.completed":
        console.log("✅ Checkout session completed:", event.data.object)
        // TODO: mark booking/order as paid in your database here
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new NextResponse("ok", { status: 200 })
  } catch (err: any) {
    console.error("❌ Webhook handler error:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
