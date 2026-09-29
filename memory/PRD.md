# PRD — Solstice '26 · DU SOL Freshers Party Pass Portal

## Original problem statement
"i am organising freshers party for du sol 2026 — i have to sell my passes for party." (Punjabi Bagh, Delhi)

## User personas
- Party-goer (DU SOL student): views details, picks a pass, pays via UPI manually, signs in with Google to confirm booking, shares payment reference + optional screenshot.
- Organiser (mahendermishra811@gmail.com): signs in with Google at /admin, reviews bookings, payment references/screenshots, confirms/rejects, reviews group-booking interests.

## Core requirements (static)
- Event: 25 October 2026, 4 PM onwards, Punjabi Bagh, New Delhi.
- Early Bird Passes (through 5 Oct): Single ₹1299 / Couple ₹2199.
- Not Late Passes (6–20 Oct): Single ₹1499 / Couple ₹2599.
- Last Minute Arrivals — Diamond VIP (21–25 Oct): Single ₹1999 / Couple ₹2999.
- Date-window availability enforced in UI (SELLING NOW / OPENS SOON / CLOSED).
- Manual UPI payment (dusol2026@oksbi) with reference capture; no payment gateway.
- Google sign-in only at booking confirmation; name/email prefill; phone mandatory.
- WhatsApp contact CTA; group-booking interest capture.
- Admin access restricted by email allowlist (`ADMIN_EMAILS`).

## Implemented
- 2026-09 (earlier): storefront, pass phases, booking + UPI reference flow, group interests, WhatsApp links, Google sign-in gate, protected endpoints.
- 2026-09-29: validated auth hardening (anonymous 401s, logout 200, bad session 401).
- 2026-09-29: organiser email configured (mahendermishra811@gmail.com) via ADMIN_EMAILS.
- 2026-09-29: admin dashboard at /admin — stats, bookings table, group interests, confirm/reject booking (PATCH), Google gate for organiser, non-admin denied state.
- 2026-09-29: payment screenshot upload (Emergent object storage), owner-or-admin file access, screenshot thumbnails in admin table.
- 2026-09-29: design overhaul — SOLSTICE '26 brand, custom SVG logo + favicon, kinetic masked hero, Lenis smooth scroll, framer-motion reveals, editorial marquee, grain overlay, parallax images, Punjabi Bagh venue copy. Modular React structure (pages + components).
- 2026-09-29: production build passes; responsive verified at 375/768/1366.

## Backlog
- P0: Real end-to-end Google OAuth sign-in + booking test by the organiser in preview.
- P1: Real WhatsApp number (currently placeholder 919999999999) — user must supply.
- P1: UPI ID is placeholder (dusol2026@oksbi) — confirm/replace with organiser's real UPI.
- P2: WhatsApp notification to organiser on new booking (needs Twilio/WhatsApp Business).
- P2: Export bookings to CSV.
- P2: Server-side pass-window enforcement (currently client-side).

## Data note
Live site (once deployed) has its own database; bookings made in preview do not appear on the live site.
