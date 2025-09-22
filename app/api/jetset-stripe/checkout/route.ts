import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { bookingId, priceId, customerEmail } = await req.json()

    if (!bookingId || !priceId) {
      return NextResponse.json(
        { error: "Missing bookingId or priceId" },
        { status: 400 }
      )
    }

    // Find or create customer
    let customerId: string
    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail || "" },
    })

    if (existingUser?.stripeCustomerId) {
      customerId = existingUser.stripeCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail || undefined,
      })
      customerId = customer.id

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { stripeCustomerId: customerId },
        })
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
      client_reference_id: bookingId,
    })

    // Save placeholder booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "PENDING", stripeId: session.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("Checkout route error:", err)
    return NextResponse.json({ error: "Checkout error" }, { status: 500 })
  }
}
