import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe, LISTING_POST_FEE_CENTS, STRIPE_CONFIGURED } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!STRIPE_CONFIGURED) {
    return NextResponse.json(
      { error: "Billing isn't set up yet. Check back soon." },
      { status: 503 }
    );
  }

  const { listingId } = await req.json();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (listing.status !== "PENDING_PAYMENT" && listing.status !== "INACTIVE") {
    return NextResponse.json({ error: "Listing is not awaiting payment" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  // Reuse the host's Stripe customer if we've already created one, so their
  // billing history/payment method stays attached across listings.
  let stripeCustomerId = user?.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId },
    });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: LISTING_POST_FEE_CENTS,
          recurring: { interval: "month" },
          product_data: {
            name: `Monthly listing fee: ${listing.title}`,
            description: "Recurring monthly fee to keep your listing live on RoomsAlike",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { listingId: listing.id },
    subscription_data: {
      metadata: { listingId: listing.id },
    },
    success_url: `${origin}/host/listings/${listing.id}/pay?success=1`,
    cancel_url: `${origin}/host/listings/${listing.id}/pay?canceled=1`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
