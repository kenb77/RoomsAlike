import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Admin-only: approve or deny a pair of double-blind reviews (Review +
// HostReview) for a booking. Approve makes both visible publicly; deny
// hides them permanently (denied stays true, visible stays false).
const patchSchema = z.object({
  action: z.enum(["approve", "deny"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { bookingId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { review: true, hostReview: true },
  });
  if (!booking || !booking.review || !booking.hostReview) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data.action === "approve"
    ? { visible: true, denied: false }
    : { visible: false, denied: true };

  await prisma.$transaction([
    prisma.review.update({ where: { bookingId: booking.id }, data }),
    prisma.hostReview.update({ where: { bookingId: booking.id }, data }),
  ]);

  return NextResponse.json({ ok: true });
}
