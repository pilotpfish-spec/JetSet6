// C:\JetSetNew6\lib\mail.ts
import nodemailer from "nodemailer";

const host = process.env.MG_SMTP_HOST || "smtp.mailgun.org";
const port = Number(process.env.MG_SMTP_PORT || 587);
const user = process.env.MG_SMTP_LOGIN || process.env.SMTP_USER || process.env.MAILGUN_SMTP_LOGIN;
const pass = process.env.MG_SMTP_PASSWORD || process.env.SMTP_PASS || process.env.MAILGUN_SMTP_PASSWORD;
const from = process.env.EMAIL_FROM || "JetSet Direct <no-reply@jetsetdirect.com>";

if (!user || !pass) {
  // Don't throw—let the caller surface a meaningful error
  console.warn("[mail] Missing Mailgun SMTP creds (MG_SMTP_LOGIN/MG_SMTP_PASSWORD).");
}

export const mailer = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

export async function sendMail(to: string, subject: string, html: string) {
  return mailer.sendMail({ from, to, subject, html });
}
