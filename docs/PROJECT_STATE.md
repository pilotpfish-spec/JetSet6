\# JetSet6 / JetSetDirectNew — Canonical Status



\*\*As of:\*\* (fill timestamp when you run snapshot)

\*\*Where we are:\*\* Phase 4 — Admin \& UX

\*\*Where we’re going:\*\* Finish Phase 4 → Phase 5 — Polish \& Deploy (Mailgun paused pending Zoho)



\## Checklist (JetSet6 order)



Phase 0 — Foundation

\- ✅ Repo cloned and dev server boots

\- ✅ Clean `.env.local`

\- ✅ Prisma schema validated

\- ✅ Stripe test keys verified



Phase 1 — JetSet Branding Pass

\- ✅ Logo + brand colors (dark navy/white)

\- ✅ Hero set updated (no nightlife)

\- ✅ Nightlife/SaaS leftovers removed



Phase 2 — Auth \& Stripe Core

\- ✅/⬜ NextAuth (credentials + Google) — confirm via snapshot

\- ✅/⬜ Stripe checkout session route — confirm via snapshot

\- ✅/⬜ Webhook connected locally — confirm via snapshot

\- ✅/⬜ Booking “unpaid” → Stripe updates to “paid” — confirm via snapshot



Phase 3 — Booking Flow Adaptation

\- ✅ Airport quote formula wired

\- ✅ Trip types (To/From/Point-to-Point)

\- ✅ DFW (A–E) + Love Field terminals

\- ✅ Email gating present; Mailgun paused



Phase 4 — Admin \& UX (current)

\- ⬜ Account page → upcoming bookings + status

\- ⬜ Admin dashboard → Upcoming/Today/Unpaid + filters

\- ⬜ Protected routes (admin-only)

\- ⬜ Helpful empty/error states



Phase 5 — Polish \& Deploy (next)

\- ⬜ Hero random image preload

\- ⬜ Testimonials / Reviews

\- ⬜ About / Contact

\- ⬜ Vercel deploy + Stripe webhook live

\- ⬜ Final smoke test: Trip → Quote → Book → Pay → Confirm email



