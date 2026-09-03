import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, deletionDeniedEmail } from "@/lib/email";

// Admin-only: approve (anonymize permanently, keep suspended so they can
// never log back into this identity) or deny (reactivate, show the user why)
// a pending account-deletion request.
const patchSchema = z.object({
  action: z.enum(["approve", "deny"]),
  denialReason: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user || !user.deletionRequested) {
    return NextResponse.json({ error: "No pending deletion request for this user" }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    // Anonymize: scrub personally-identifying fields but keep the row (and
    // its id) so existing bookings/listings/reviews/messages stay intact for
    // the other party. suspended stays true forever — this identity can
    // never log in again.
    const randomPassword = await import("bcryptjs").then((b) =>
      b.hash(`deleted-${user.id}-${Date.now()}`, 10)
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Deleted user",
        email: `deleted-${user.id}@deleted.roomsalike.local`,
        password: randomPassword,
        paymentInfo: null,
        suspended: true,
        deletionRequested: false,
        deletionDenialReason: null,
      },
    });
    return NextResponse.json({ ok: true, action: "approved" });
  }

  // Deny: reactivate the account and record why, so the user sees it and
  // can appeal or request again.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      suspended: false,
      deletionRequested: false,
      deletionDenialReason: parsed.data.denialReason || "No reason given.",
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await sendEmail({
    to: user.email,
    ...deletionDeniedEmail({
      userName: user.name,
      reason: parsed.data.denialReason || null,
      loginUrl: `${baseUrl}/login`,
    }),
  });

  return NextResponse.json({ ok: true, action: "denied" });
}
