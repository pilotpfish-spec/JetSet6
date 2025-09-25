import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  unitAmount: number;        // cents, integer (e.g., 2599)
  email: string;             // required for Stripe to email invoice
  bookingId?: string;
  description?: string;
  daysUntilDue?: number;     // default 7

  // Trip details to display on the invoice
  dateIso?: string;          // scheduled service datetime (ISO)
  pickupAddress?: string;
  dropoffAddress?: string;
  airport?: string;          // e.g., "DFW" or "DAL"
  terminal?: string;         // e.g., "Terminal C"
};

function fmtWhen(dateIso?: string) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
}
function compact(s?: string) {
  return (s || "").trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // Coerce and validate cents
    const cents = Math.round(Number(body.unitAmount));
    if (!Number.isFinite(cents) || cents < 50) {
      return NextResponse.json({ error: "Invalid unitAmount (min 50 cents)" }, { status: 400 });
    }
    const email = (body.email || "").trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Prepare readable trip info
    const when = fmtWhen(body.dateIso);
    const pickup = compact(body.pickupAddress);
    const dropoff = compact(body.dropoffAddress);
    const airport = compact(body.airport);
    const terminal = compact(body.terminal);

    const parts: string[] = [];
    if (pickup || dropoff) parts.push([pickup, dropoff].filter(Boolean).join(" → "));
    if (airport && terminal) parts.push(`${airport} — ${terminal}`);
    else if (airport) parts.push(airport);
    if (when) parts.push(when);

    const lineDescription =
      body.description ||
      (parts.length ? `Ground Service — ${parts.join(" | ")}` : "Ground Service — Pay Later");

    // 1) Create a customer for this email (simple path; de-dupe later if you wish)
    const customer = await stripe.customers.create({ email });

    // 2) Create a DRAFT invoice first (with custom fields visible on invoice)
    const custom_fields = [
      when ? { name: "Service Date", value: when } : undefined,
      pickup ? { name: "Pickup", value: pickup } : undefined,
      dropoff ? { name: "Dropoff", value: dropoff } : undefined,
      airport || terminal
        ? { name: "Airport/Terminal", value: [airport, terminal].filter(Boolean).join(" — ") }
        : undefined,
    ].filter(Boolean) as { name: string; value: string }[];

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: typeof body.daysUntilDue === "number" ? Math.max(1, Math.floor(body.daysUntilDue)) : 7,
      metadata: {
        ...(body.bookingId ? { bookingId: body.bookingId } : {}),
        pickup,
        dropoff,
        airport,
        terminal,
        dateIso: body.dateIso || "",
      },
      description: lineDescription,
      footer: "Thank you for choosing JetSet Direct — Ground Service Elevated.",
      ...(custom_fields.length ? { custom_fields } : {}),
    });

    // 3) Attach the line item *directly to this invoice*
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: "usd",
      amount: cents, // already integer cents
      description: lineDescription,
      metadata: body.bookingId ? { bookingId: body.bookingId } : undefined,
      invoice: invoice.id, // <-- key to ensure non-$0 totals
    });

    // 4) Finalize the invoice so we get the hosted link, then send it
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalized.id);

    const url = finalized.hosted_invoice_url || invoice.hosted_invoice_url;
    if (!url) {
      return NextResponse.json({ error: "Invoice URL unavailable" }, { status: 500 });
    }

    return NextResponse.json({
      invoiceId: finalized.id,
      url,
      customerId: customer.id,
      amountDue: finalized.amount_due,
      currency: finalized.currency,
      status: finalized.status,
    });
  } catch (err: any) {
    console.error("Invoice error:", err?.message || err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
