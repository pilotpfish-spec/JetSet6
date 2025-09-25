import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  unitAmount: number;
  email: string;
  description?: string;
  daysUntilDue?: number;
  dateIso?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  airport?: string;
  terminal?: string;
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    // Validate amount & email
    const cents = Math.round(Number(body.unitAmount));
    if (!Number.isFinite(cents) || cents < 50) {
      return NextResponse.json({ error: "Invalid unitAmount (min 50 cents)" }, { status: 400 });
    }
    const email = (body.email || "").trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Trip details
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

    // === 1) Create booking in DB ===
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        pickup,
        dropoff,
        status: "UNPAID",
        priceCents: cents,
        scheduledAt: body.dateIso ? new Date(body.dateIso) : new Date(),
      },
    });

    // === 2) Stripe customer & invoice ===
    const customer = await stripe.customers.create({ email });

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
        bookingId: booking.id,
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

    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: "usd",
      amount: cents,
      description: lineDescription,
      metadata: { bookingId: booking.id },
      invoice: invoice.id,
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalized.id);

    const url = finalized.hosted_invoice_url || invoice.hosted_invoice_url;
    if (!url) {
      return NextResponse.json({ error: "Invoice URL unavailable" }, { status: 500 });
    }

    return NextResponse.json({
      bookingId: booking.id,
      invoiceId: finalized.id,
      url,
      amountDue: finalized.amount_due,
      currency: finalized.currency,
      status: finalized.status,
    });
  } catch (err: any) {
    console.error("Invoice error:", err?.message || err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
