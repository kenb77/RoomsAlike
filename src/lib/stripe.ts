import Stripe from "stripe";

// Stripe isn't set up yet on this deploy (waiting on a real account) — fall
// back to a placeholder so the app can still build and run. Any route that
// actually calls Stripe (checkout, identity verification, billing portal)
// will fail at request time with a clear Stripe auth error until a real
// STRIPE_SECRET_KEY is added, but nothing else on the site is blocked.
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_not_configured_yet",
  { apiVersion: "2026-07-29.dahlia" }
);

export const STRIPE_CONFIGURED = Boolean(process.env.STRIPE_SECRET_KEY);

export const LISTING_POST_FEE_CENTS = Number(
  process.env.LISTING_POST_FEE_CENTS ?? 2000
);
