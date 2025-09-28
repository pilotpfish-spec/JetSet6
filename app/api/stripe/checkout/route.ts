// app/api/stripe/checkout/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Meta = {
  distance?: string;   // as string for Stripe metadata
  minutes?: string;
  from?: string;
  to?: string;
  airport?: string;
  terminal?: string;
  dateIso?: string;
  bookingId?: string;
};

function baseUrlFromRequest(req: Request) {
  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")).toString();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host).toString();
  return `${proto}://${host}`;
}

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
      priceId,          // optional: if provided, we use it
      unitAmount,       // optional: integer cents (>= 100)
      email,            // optional, recommended
      metadata,         // optional: will be merged with our safeMeta
      bookingId,        // optional: also copied into metadata
      successPath = "/account?paid=1",
      cancelPath = "/quote?canceled=1",
    }: {
      priceId?: string;
      unitAmount?: number;
      email?: string;
      metadata?: Record<string, any>;
      bookingId?: string;
      successPath?: string;
      cancelPath?: string;
    } = body || {};

    if (!priceId && !(Number.isInteger(unitAmount) && unitAmount! >= 100)) {
      return new Response(
        JSON.stringify({ error: "Provide either a valid priceId or unitAmount (integer cents ≥ 100)." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const base = baseUrlFromRequest(req);

    // Normalize + sanitize metadata for Stripe (must be strings)
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

    // (Optional) reuse or create customer by email
    let customerId: string | undefined;
    if (email) {
      const found = await stripe.customers.list({ email, limit: 1 });
      if (found.data.length > 0) {
        customerId = found.data[0].id;
      } else {
        const created = await stripe.customers.create({ email });
        customerId = created.id;
      }
    }

    const line_items =
      priceId
        ? [{ price: priceId as string, quantity: 1 }]
        : [{
            price_data: {
              currency: "usd",
              product_data: {
                name: "JetSet Direct Ride",
                description: "Point-to-point ground service",
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      customer: customerId,
      customer_email: !customerId && email ? email : undefined,
      line_items,
      success_url: `${base}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${cancelPath}`,
      metadata: Object.fromEntries(
        Object.entries(safeMeta).filter(([_, v]) => typeof v === "string" && v.length > 0)
      ),
    });

    if (!session.url) {
      return new Response(JSON.stringify({ error: "Stripe did not return a checkout URL." }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Never include secrets; return a safe error
    console.error("[/api/stripe/checkout] error", err?.message || err);
    const msg = err?.raw?.message || err?.message || "Checkout failed.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
