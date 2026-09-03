import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_CONFIGURED } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!STRIPE_CONFIGURED) {
    return NextResponse.json(
      { error: "Billing isn't set up yet. Check back soon." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account on file yet" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL;
  const body = await req.json().catch(() => ({}));
  const returnPath = body?.returnPath === "/account" ? "/account" : "/host/dashboard";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}${returnPath}`,
  });

  return NextResponse.json({ url: portalSession.url });
}
