import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, deletionRequestedEmail } from "@/lib/email";

const bodySchema = z.object({
  reason: z.string().max(1000).optional(),
});

// A renter or host asking to delete their account. This immediately
// suspends the account (blocks login) until an admin reviews it: approving
// anonymizes the account permanently, denying reactivates it with a reason
// the user can see, and they're free to request again after that.
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.deletionRequested) {
    return NextResponse.json({ error: "A deletion request is already pending" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      suspended: true,
      deletionRequested: true,
      deletionReason: parsed.data.reason || null,
      deletionRequestedAt: new Date(),
      deletionDenialReason: null,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  for (const admin of admins) {
    const { subject, html } = deletionRequestedEmail({
      userName: user.name,
      userEmail: user.email,
      reason: parsed.data.reason || null,
      adminUrl: `${baseUrl}/admin`,
    });
    await sendEmail({ to: admin.email, subject, html });
  }

  return NextResponse.json({ ok: true });
}
