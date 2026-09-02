# RoomsAlike — hourly space rental marketplace

Hosts post a space (up to 4 photos) and pay a monthly subscription to keep it listed. Renters
browse by location/distance/price, request specific hours on a specific date, and the host
approves or declines. No money moves through the platform for bookings — once approved, the
renter and host arrange the deposit and payment directly with each other. Both sides must
verify their identity (Stripe Identity) before they can post a listing or request a booking.

## Stack

- Next.js 14 (App Router, TypeScript, Tailwind)
- Prisma ORM 7 + PostgreSQL (via `@prisma/adapter-pg`, no native binary engine required)
- NextAuth (credentials/email+password, JWT sessions)
- Stripe Checkout + Subscriptions (monthly host listing fee only — no booking payments)
- Stripe Identity (government ID verification, required for hosts and renters)
- OpenStreetMap Nominatim (free geocoding for distance search)
- Custom booking calendar with hourly time slots (no external calendar dependency)
- Polling-based messaging between renter and host

## Features

- **Auth & roles** — renter / host / admin, sign up chooses "book a space" (renter) or "list a
  space to rent out" (host).
- **ID verification** — both hosts and renters must complete Stripe Identity document
  verification before they can post a listing or request a booking. Status lives on `/verify`.
- **Listings** — hosts create a draft listing (title, description, location, hourly rate,
  optional multi-hour discount, up to 4 photo URLs), subscribe monthly via Stripe Checkout, and
  it goes live (`ACTIVE`) once the webhook confirms the subscription. Listings are geocoded on
  creation (best-effort) so they show up in distance search.
- **Search** — homepage supports free-text location search (city, address, zip) with a
  10/25/50/100+ mile radius, plus min/max hourly-price filters.
- **Booking calendar** — pick a date, then a start/end time; already-requested/approved times
  that day are shown so renters can avoid overlap (only those hours are blocked — other hours on
  the same day stay bookable). Live price estimate with the multi-hour discount applied
  automatically. When the host views their own listing, the same calendar switches to a host
  view: days with a pending request show an amber dot, approved bookings show a green dot, and
  clicking a date reveals cards for that day's bookings — renter name, time range, guest count,
  estimated total, approve/decline actions, and a private deposit note the host can jot down for
  their own tracking. These card details are host-only; renters and other visitors only ever see
  a date as unavailable, never another renter's name or booking info.
- **Booking → approval flow** — renter's request is `PENDING`; host approves (`APPROVED`) or
  declines (`CANCELLED`). No payment happens on the platform — the booking card explicitly says
  to arrange the deposit/payment directly with the other party (use the built-in messaging).
- **Multi-day bookings** — renters can click a date, then click a later date to select a range
  (check-in/check-out), with hour-precision times on each end. Price is still hours × hourly rate
  with the multi-hour discount applied. Calendars (renter, host, and the renter's own "my
  bookings" calendar) mark every day a booking spans, not just its start day.
- **Editable bookings** — either host or renter can edit a booking's date/time after the fact
  (price recalculates, overlap is re-checked), and a system notice auto-posts in the shared chat
  so the other side sees exactly what changed. Cancelling works the same way — it frees the dates
  back up on both the host's and renter's calendars immediately and posts a chat notice.
- **Amenities & policies** — hosts pick from a predefined amenities checklist and can write a
  cancellation policy and a refund policy per listing, shown on the listing page.
- **Quick replies & payment info** — hosts can save canned message snippets per listing (door
  code, WiFi password, where to put towels, or fully custom ones — sample templates provided) and
  one payment-info snippet on their profile (Venmo/Zelle/PayPal etc.). Both insert into the chat
  composer with one click from the conversation thread.
- **Reviews** — double-blind: both the renter (of the listing/host) and the host (of the renter)
  can submit a review starting 24 hours after the booking's end time. Neither becomes visible to
  anyone until *both* have submitted — at which point both reveal at once. Average ratings show on
  listing cards and the listing detail page (renter reviews only); the host's rating of a renter
  and the renter's rating of a booking are shown privately on the host dashboard and the renter's
  "my bookings" page respectively.
- **Messaging** — renters can message a host from a listing page; both sides see a shared inbox
  and a live-updating (polled) thread — this is also where they're expected to sort out rules,
  deposits, and payment. Auto-generated notices (booking edited/approved/cancelled) appear inline,
  visually distinct from regular messages.
- **Admin dashboard** — totals for users/listings/bookings/reviews/verified-users and monthly
  recurring revenue from host subscriptions, plus a table of every listing and its subscription
  status.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Postgres** (Docker required)

   ```bash
   docker compose up -d
   ```

   Or point `DATABASE_URL` in `.env` at any hosted Postgres (Neon, Supabase, Railway, etc.).

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in:
   - `DATABASE_URL` — your Postgres connection string.
   - `NEXTAUTH_SECRET` — any random string (`openssl rand -base64 32`).
   - `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from your Stripe dashboard
     (test mode keys are fine). These same keys power both the host subscription checkout and
     Stripe Identity verification.
   - `STRIPE_WEBHOOK_SECRET` — from `stripe listen` (see below) or your Stripe webhook
     endpoint settings.
   - `LISTING_POST_FEE_CENTS` — the monthly fee a host pays per active listing, in cents.

   Before Stripe Identity will actually work, enable it once in your Stripe dashboard
   (Identity has its own product activation step and a small per-verification cost —
   see https://dashboard.stripe.com/identity/application).

4. **Push the schema and seed sample data**

   ```bash
   npx prisma generate
   npm run db:push
   npm run db:seed
   ```

   Seeded accounts (all on the `stayhaven.dev` domain, passwords below):
   - Admin  — `admin@stayhaven.dev` / `admin1234`
   - Host   — `host@stayhaven.dev` / `host1234` (pre-marked as ID verified)
   - Renter — `renter@stayhaven.dev` / `renter1234` (pre-marked as ID verified)

   The seed creates 6 active demo listings (stock photos, coordinates for distance search,
   hourly rates with multi-hour discounts) and one completed, approved, reviewed booking so the
   review UI has something to show.

5. **Forward Stripe webhooks locally** (in a separate terminal, requires the Stripe CLI)

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in `.env`.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000.

## Upgrading from an earlier version of this project

This round of changes is another breaking schema change: `Role.GUEST` became `Role.RENTER`,
`Booking` moved from day-level `startDate`/`endDate` to hour-precision `startTime`/`endTime`,
the `PAID` booking status and all Stripe payment fields on `Booking` were removed (no more
booking payments), `Conversation`/`Review`/`Booking` relations were renamed from `guest*` to
`renter*`, `Listing.pricePerNight` became `pricePerHour` plus optional discount fields, and
`User` gained `idVerificationStatus`/`stripeIdentitySessionId`. To upgrade:

```bash
npx prisma generate
npm run db:push
```

Accept any data-loss warnings — this is demo data. If you want to keep existing data, back it
up first or migrate it manually before pushing.

## How ID verification works

1. User visits `/verify` and clicks "Start verification" → `POST /api/identity/verify` creates
   a Stripe Identity `VerificationSession` (document type) and redirects them to Stripe's
   hosted verification flow.
2. Stripe collects and checks their government ID (and a selfie match) on their own secure
   page — this app never sees or stores the actual document/photo.
3. Stripe redirects back to `/verify?complete=1`. The final result arrives via webhook:
   `identity.verification_session.verified` sets `idVerificationStatus` to `VERIFIED`;
   `identity.verification_session.requires_input` sets it to `FAILED` (with a retry option).
4. Hosts can't reach the "post a listing" form, and renters can't submit a booking request,
   until `idVerificationStatus` is `VERIFIED`.

## How the host subscription works

1. A host fills out "Post a new space" (gated behind ID verification) → a `Listing` is created
   with status `PENDING_PAYMENT`, geocoded best-effort via Nominatim.
2. They're sent to `/host/listings/[id]/pay`, which calls `/api/stripe/checkout` to create a
   Stripe Checkout Session in `subscription` mode, billing `LISTING_POST_FEE_CENTS` every month.
3. On `checkout.session.completed`, the webhook creates a `Subscription` row and flips the
   `Listing` to `ACTIVE`.
4. `customer.subscription.updated` / `.deleted` events keep `Subscription.status` and
   `Listing.status` in sync — a failed payment or cancellation sets the listing back to
   `INACTIVE` automatically, and the host sees a "Resubscribe" button.
5. Hosts can manage their card / cancel via "Manage billing" on the dashboard, which opens the
   Stripe Billing Portal.

## How the booking flow works (no on-platform payment)

1. Renter (ID verified) picks a date and a start/end time on a listing → sees a live price
   estimate (hourly rate, with the multi-hour discount applied if it qualifies) →
   `POST /api/bookings` creates a `PENDING` booking and a `Conversation` with the host.
2. Host approves (`APPROVED`) or declines (`CANCELLED`) from their dashboard.
3. Nothing is charged. The booking card tells the renter to message the host and arrange the
   deposit and full payment directly — rules, deposits, and payment terms are between the two
   of them, not the platform.
4. Once the booked end time has passed on an `APPROVED` booking, the renter can leave a review
   (`POST /api/bookings/[id]/review`), one per booking.

## Distance search

Search location text is geocoded server-side via OpenStreetMap's free Nominatim API (no key
required). Listings are geocoded once, at creation time, and their lat/lng stored on the
`Listing` row. Distance filtering/sorting happens in application code (Haversine formula) over
listings that already have coordinates — no PostGIS or paid geocoding API needed.

## Data model

`User` (with `idVerificationStatus`) → `Listing` (host) → `Subscription` (1:1 recurring posting
fee) / `Booking` (many, hour-precision `startTime`/`endTime`) / `Conversation` (many, one per
renter per listing) → `Message` (many). `Booking` → `Review` (1:1, optional, only after the
booked time has passed and the host approved).

See `prisma/schema.prisma` for the full schema.

## Notes / next steps for production

- Photo "upload" is just pasted URLs (up to 4) — wire up real file upload (S3, Cloudinary,
  UploadThing) if hosts should be able to upload directly instead of linking existing images.
- Messaging polls every 4s; swap for Pusher/Ably/WebSockets if you need real-time at scale.
- Add email notifications (booking requests, approvals, verification results, new messages)
  via Resend/Postmark.
- Consider a cancellation/no-show policy UI, even though payment itself stays off-platform —
  e.g. letting either side mark a booking as fell-through.
- Add rate limiting / input sanitization before taking this beyond a prototype.
- This was built and production-built (`npm run build`) successfully in a sandboxed
  environment without live network access to a real Postgres instance or Stripe/Nominatim, so
  the full identity-verification and booking flows haven't been exercised end-to-end — test
  locally before relying on them.
