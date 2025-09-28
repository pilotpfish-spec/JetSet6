// app/api/stripe/webhook/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const secret = assertEnv("STRIPE_WEBHOOK_SECRET");
  const stripe = new Stripe(assertEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" as any });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error("[stripe webhook] signature verify failed", err?.message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("checkout.session.completed", {
          id: session.id,
          amount_total: session.amount_total,
          customer: session.customer,
          email: session.customer_details?.email,
          metadata: session.metadata,
        });
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.finalized":
      case "invoice.sent": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(event.type, {
          id: invoice.id,
          customer: invoice.customer,
          email: invoice.customer_email,
          amount_due: invoice.amount_due,
          hosted_invoice_url: invoice.hosted_invoice_url,
          metadata: invoice.metadata,
        });
        break;
      }
      default:
        // Keep the endpoint flexible for future events
        console.log("Unhandled event", event.type);
    }

    return new Response("ok");
  } catch (e: any) {
    console.error("[stripe webhook] handler error", e?.message || e);
    return new Response("handler error", { status: 500 });
  }
}
