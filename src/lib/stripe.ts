import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-07-29.dahlia",
});

export const LISTING_POST_FEE_CENTS = Number(
  process.env.LISTING_POST_FEE_CENTS ?? 2000
);
