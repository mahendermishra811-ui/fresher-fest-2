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
- Manual UPI payment with reference capture; no payment gateway. UPI ID + WhatsApp number are organiser-editable in /admin → Settings (stored in `settings` collection; code defaults: 7065319679@fam / 917065319679).
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
- 2026-09-29 (iteration 3): real organiser UPI ID (7065319679@fam) and WhatsApp (917065319679) applied; organiser-editable settings (GET /api/settings public, GET /api/settings/admin + PUT /api/settings admin-only); frontend `useSettings()` hook drives UPI box + all WhatsApp links. CSV exports (GET /api/bookings/export, /api/interests/export, admin-only). WhatsApp booking alert via Twilio (env-gated: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM — NOT configured yet, alerts silently skipped; status shown in Settings tab). Admin UI: Settings tab + export buttons. Tested: 19/19 backend tests + all frontend flows (test_reports/iteration_3.json). Confirmed anonymous POST /api/bookings = 401.
- 2026-09-29 (iteration 4): server-side pass windows + price/quantity validation (IST, 400 with friendly detail shown in booking modal); digital pass — every booking gets `pass_token`, public `/pass/:token` ticket page with QR (qrcode.react), status pill, share + help buttons; organiser sees gate panel + "Mark as checked in" (POST /api/pass/{token}/checkin, confirmed-only, single use); confirmation modal links to the pass and prefills a WhatsApp message with booking details to the organiser (acts as the booking alert — user chose to skip Twilio); admin table Ticket column (open pass, send pass to guest on WhatsApp once confirmed, IN tag); CSV includes checked_in_at. Tested 18/18 backend + all UI flows (test_reports/iteration_4.json). Test data wiped.
- 2026-09-29 (iteration 5): My Passes page (/my-passes, GET /api/bookings/mine scoped per user; "My passes" nav link when signed in); Instagram countdown share card (canvas 1080×1350 PNG, download + native share, opened from Details section); admin live check-in counter (checked in / confirmed + guests inside, 15s polling). Tested 6/6 backend + all UI flows (test_reports/iteration_5.json). Test data wiped.

## Backlog
- P0: Real end-to-end Google OAuth sign-in + booking test by the organiser in preview (only the user can do this).
- P2: Twilio WhatsApp push alerts (built, env-gated; user skipped for now).

## Data note
Live site (once deployed) has its own database; bookings made in preview do not appear on the live site.
