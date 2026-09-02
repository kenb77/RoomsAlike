import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { sendEmail, newListingPendingReviewEmail } from "@/lib/email";

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

async function syncListingFromSubscription(subscription: Stripe.Subscription) {
  const listingId = subscription.metadata?.listingId;
  if (!listingId) return;

  const status = mapStripeStatus(subscription.status);
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  await prisma.subscription.upsert({
    where: { listingId },
    create: {
      listingId,
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
    },
    update: {
      status,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
    },
  });

  // Payment being active doesn't put the listing live by itself — it still
  // needs admin approval the first time. Once a listing has been approved
  // once (approvedAt is set), later renewals/reactivations skip review.
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  const newStatus =
    status !== "ACTIVE"
      ? "INACTIVE"
      : listing?.approvedAt
      ? "ACTIVE"
      : "PENDING_REVIEW";

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: newStatus },
  });

  if (newStatus === "PENDING_REVIEW") {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    for (const admin of admins) {
      const { subject, html } = newListingPendingReviewEmail({
        listingTitle: listing?.title ?? "A listing",
        adminUrl: `${baseUrl}/admin`,
      });
      await sendEmail({ to: admin.email, subject, html });
    }
  }
}

async function handleIdentityVerified(verificationSession: Stripe.Identity.VerificationSession) {
  const userId = verificationSession.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { idVerificationStatus: "VERIFIED" },
  });
}

async function handleIdentityRequiresInput(verificationSession: Stripe.Identity.VerificationSession) {
  const userId = verificationSession.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { idVerificationStatus: "FAILED" },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error("Missing Stripe signature or webhook secret");
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncListingFromSubscription(subscription);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncListingFromSubscription(subscription);
      break;
    }

    case "identity.verification_session.verified": {
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
      await handleIdentityVerified(verificationSession);
      break;
    }

    case "identity.verification_session.requires_input": {
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
      await handleIdentityRequiresInput(verificationSession);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
