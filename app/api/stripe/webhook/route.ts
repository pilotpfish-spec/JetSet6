import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const buf = await req.arrayBuffer();
  const rawBody = Buffer.from(buf);
  const sig = req.headers.get("stripe-signature") || "";

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // Example: update booking as paid
        if (session.metadata?.bookingId) {
          await prisma.booking.update({
            where: { id: session.metadata.bookingId },
            data: { status: "PAID" },
          });
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;

        // Example: mark invoice paid
        if (invoice.id) {
          await prisma.invoice.upsert({
            where: { id: invoice.id },
            update: { status: "PAID" },
            create: {
              id: invoice.id,
              customerId: invoice.customer as string,
              status: "PAID",
              amountDue: invoice.amount_due,
            },
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;

        // Example: mark invoice unpaid/failed
        if (invoice.id) {
          await prisma.invoice.upsert({
            where: { id: invoice.id },
            update: { status: "FAILED" },
            create: {
              id: invoice.id,
              customerId: invoice.customer as string,
              status: "FAILED",
              amountDue: invoice.amount_due,
            },
          });
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook error:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }
}
