import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000),
});

const REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;

// The host's review of the renter for this booking. Mirrors the renter's
// review endpoint — same 24h-after-end gate, same double-blind reveal.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { review: true, hostReview: true, listing: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.listing.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved bookings can be reviewed" }, { status: 400 });
  }
  const eligibleAt = new Date(booking.endTime.getTime() + REVIEW_DELAY_MS);
  if (eligibleAt > new Date()) {
    return NextResponse.json(
      { error: "You can review this starting 24 hours after the booking ends" },
      { status: 400 }
    );
  }
  if (booking.hostReview) {
    return NextResponse.json({ error: "You've already reviewed this renter" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Once both sides have submitted, it's queued for admin approval below —
  // visible only flips to true once an admin approves it, not automatically.
  const hostReview = await prisma.hostReview.create({
    data: {
      bookingId: booking.id,
      listingId: booking.listingId,
      hostId: session.user.id,
      renterId: booking.renterId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json(hostReview);
}
