import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_CONFIGURED } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!STRIPE_CONFIGURED) {
    return NextResponse.json(
      { error: "ID verification isn't set up yet — check back soon." },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL;

  // Authenticate the user before sending them to Stripe, and tag the session
  // with our own user id so the webhook can match it back up.
  const verificationSession = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { userId: session.user.id },
    return_url: `${origin}/verify?complete=1`,
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      stripeIdentitySessionId: verificationSession.id,
      idVerificationStatus: "PENDING",
    },
  });

  return NextResponse.json({ url: verificationSession.url });
}
