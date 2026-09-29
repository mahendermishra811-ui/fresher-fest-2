# DU SOL Freshers Party 2026 Pass Portal

## Original problem statement
i am organising freshers party for du sol 2026
i have to sell my passes for party

## Architecture decisions
- React single-page event storefront with responsive neon festival visual system.
- FastAPI `/api/bookings` and `/api/interests` endpoints backed by the existing MongoDB connection and environment configuration.
- Manual UPI flow captures a payment reference before creating a booking; WhatsApp remains the direct organiser support channel.

## Implemented
- Hero, party experience, event details, DJ/food/mocktail/bar highlights, venue and date sections.
- Three pass tiers with single/couple variants and date-based price increases.
- Live event countdown and pass selection modal with UPI ID, copy control, booking validation and confirmation reference.
- Group booking interest form and persisted interest endpoint.
- Responsive mobile navigation, accessible controls, descriptive test IDs, and WhatsApp CTAs.

## Prioritized backlog
- P0: Replace sample organiser WhatsApp number and event details with the organiser’s final contact information.
- P1: Add a secure organiser dashboard with authentication and booking/interest status management.
- P1: Add hosted payment-proof image storage if the organiser wants uploads instead of UPI reference text.
- P2: Add automated WhatsApp/email confirmation after payment review.