import { NextResponse } from "next/server";

function required(name: string, val?: string) {
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

async function sendMail({ to, subject, text, html }:{to:string;subject:string;text:string;html:string}) {
  const apiKey = required("MAILGUN_API_KEY", process.env.MAILGUN_API_KEY);
  const domain = required("MAILGUN_DOMAIN", process.env.MAILGUN_DOMAIN);
  const from = required("EMAIL_FROM", process.env.EMAIL_FROM);

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", to);
  body.set("subject", subject);
  body.set("text", text);
  body.set("html", html);

  const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`Mailgun failed: ${resp.status} ${await resp.text().catch(()=> "")}`);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      customerName = "Guest",
      customerEmail = "",
      phone = "",
      date = "",
      pickupAddress = "",
      dropoffAddress = "",
      distance = "",
      fare = "",
      notes = "",
      paymentMethod = "pay_later",
    } = data || {};

    const owner = process.env.EMAIL_FROM || "owner@example.com";
    const subject = `[JetSetDirect] Booking ${paymentMethod === "pay_later" ? "(Pay Later)" : ""} — ${customerName}`;
    const text = `New booking:
Name: ${customerName}
Email: ${customerEmail}
Phone: ${phone}
Date: ${date}
Pickup: ${pickupAddress}
Dropoff: ${dropoffAddress}
Distance: ${distance}
Fare: ${fare}
Payment: ${paymentMethod}
Notes: ${notes}`;
    const html = `
      <h3>New booking ${paymentMethod === "pay_later" ? "(Pay Later)" : ""}</h3>
      <ul>
        <li><b>Name:</b> ${customerName}</li>
        <li><b>Email:</b> ${customerEmail}</li>
        <li><b>Phone:</b> ${phone}</li>
        <li><b>Date:</b> ${date}</li>
        <li><b>Pickup:</b> ${pickupAddress}</li>
        <li><b>Dropoff:</b> ${dropoffAddress}</li>
        <li><b>Distance:</b> ${distance}</li>
        <li><b>Fare:</b> ${fare}</li>
        <li><b>Payment:</b> ${paymentMethod}</li>
        <li><b>Notes:</b> ${notes}</li>
      </ul>`;

    await sendMail({ to: owner, subject, text, html });

    if (customerEmail) {
      await sendMail({
        to: customerEmail,
        subject: "JetSet Direct — Booking received",
        text: `We received your booking. Payment method: ${paymentMethod}. We'll confirm shortly.`,
        html: `<p>We received your booking.</p><p><b>Payment method:</b> ${paymentMethod}</p><p>We’ll confirm shortly.</p>`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "notify-failed" }, { status: 500 });
  }
}
