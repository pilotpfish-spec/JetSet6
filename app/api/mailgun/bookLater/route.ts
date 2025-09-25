import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const {
      toEmail,
      invoiceUrl,
      bookingId,
      fareCents,
      pickupAddress,
      dropoffAddress,
      dateIso,
    } = await req.json();

    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !domain || !from) {
      return NextResponse.json(
        { error: "Mailgun not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN, EMAIL_FROM)" },
        { status: 500 }
      );
    }
    if (!toEmail || !invoiceUrl) {
      return NextResponse.json({ error: "Missing toEmail or invoiceUrl" }, { status: 400 });
    }

    const subject = "Your JetSet Direct invoice — Book now, pay later";
    const fare = Number.isFinite(fareCents) ? (fareCents / 100).toFixed(2) : undefined;

    const text = [
      "Thanks for booking with JetSet Direct.",
      bookingId ? `Booking ID: ${bookingId}` : "",
      fare ? `Quoted Fare: $${fare}` : "",
      pickupAddress ? `Pickup: ${pickupAddress}` : "",
      dropoffAddress ? `Dropoff: ${dropoffAddress}` : "",
      dateIso ? `Date: ${new Date(dateIso).toLocaleString()}` : "",
      "",
      `Pay your invoice securely here: ${invoiceUrl}`,
      "",
      "If you have questions, just reply to this email.",
    ]
      .filter(Boolean)
      .join("\n");

    const form = new URLSearchParams();
    form.set("from", from);
    form.set("to", toEmail);
    form.set("subject", subject);
    form.set("text", text);

    const auth = "Basic " + Buffer.from(`api:${apiKey}`).toString("base64");
    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Mailgun error:", res.status, body);
      return NextResponse.json({ error: "Mailgun send failed", details: body }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("bookLater mail error:", err?.message || err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
