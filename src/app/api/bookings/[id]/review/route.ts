import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { review: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.renterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved bookings can be reviewed" }, { status: 400 });
  }
  if (booking.endTime > new Date()) {
    return NextResponse.json({ error: "You can review this after the booked time has passed" }, { status: 400 });
  }
  if (booking.review) {
    return NextResponse.json({ error: "You've already reviewed this booking" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      listingId: booking.listingId,
      renterId: session.user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json(review);
}
