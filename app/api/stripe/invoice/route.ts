// app/api/stripe/invoice/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Meta = {
  bookingId?: string;
  distance?: string;
  minutes?: string;
  from?: string;
  to?: string;
  airport?: string;
  terminal?: string;
  dateIso?: string;
};

function assertEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const stripeSecret = assertEnv("STRIPE_SECRET_KEY");
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" as any });

  try {
    const body = await req.json().catch(() => ({} as any));
    const {
      email,
      priceId,
      unitAmount,
      bookingId,
      metadata,
      daysUntilDue = 3,
    }: {
      email?: string;
      priceId?: string;
      unitAmount?: number;
      bookingId?: string;
      metadata?: Record<string, any>;
      daysUntilDue?: number;
    } = body || {};

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required to create an invoice." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    if (!priceId && !(Number.isInteger(unitAmount) && unitAmount! >= 100)) {
      return new Response(
        JSON.stringify({ error: "Provide either a valid priceId or unitAmount (integer cents ≥ 100)." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Find or create customer
    let customerId: string;
    const found = await stripe.customers.list({ email, limit: 1 });
    if (found.data.length > 0) {
      customerId = found.data[0].id;
    } else {
      const created = await stripe.customers.create({ email });
      customerId = created.id;
    }

    const safeMeta: Meta = {
      bookingId: bookingId?.toString(),
      distance: metadata?.distance?.toString() ?? undefined,
      minutes: metadata?.minutes?.toString() ?? undefined,
      from: metadata?.from?.toString() ?? undefined,
      to: metadata?.to?.toString() ?? undefined,
      airport: metadata?.airport?.toString() ?? undefined,
      terminal: metadata?.terminal?.toString() ?? undefined,
      dateIso: metadata?.dateIso?.toString() ?? undefined,
    };

    // Add an invoice item
    if (priceId) {
      await stripe.invoiceItems.create({
        customer: customerId,
        price: priceId,
        quantity: 1,
        metadata: safeMeta,
      });
    } else {
      await stripe.invoiceItems.create({
        customer: customerId,
        currency: "usd",
        amount: unitAmount!,
        description: "JetSet Direct Ride",
        metadata: safeMeta,
      });
    }

    // Create + finalize + send
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: Math.max(1, Math.min(60, Number(daysUntilDue) || 3)),
      metadata: safeMeta,
      // ✅ ensure the pending invoice item above is included on this invoice
      pending_invoice_items_behavior: "include",
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    // (Optional) you can skip sendInvoice if you prefer to show the hosted link only
    await stripe.invoices.sendInvoice(finalized.id);

    if (!finalized.hosted_invoice_url) {
      return new Response(JSON.stringify({ error: "Stripe did not return a hosted invoice URL." }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ hostedInvoiceUrl: finalized.hosted_invoice_url }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("[/api/stripe/invoice] error", err?.message || err);
    const msg = err?.raw?.message || err?.message || "Invoice creation failed.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

