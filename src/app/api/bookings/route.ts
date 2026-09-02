import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, bookingRequestEmail } from "@/lib/email";

const createSchema = z.object({
  listingId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  guests: z.number().int().positive().default(1),
});

function priceForHours(hours: number, pricePerHour: number, discountThresholdHours: number | null, discountPercent: number | null) {
  let total = hours * pricePerHour;
  if (discountThresholdHours != null && discountPercent != null && hours >= discountThresholdHours) {
    total = total * (1 - discountPercent / 100);
  }
  return Math.round(total * 100) / 100;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: { renterId: session.user.id },
    include: { listing: true },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const renter = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (renter?.idVerificationStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Verify your ID before requesting a booking" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, guests } = parsed.data;
  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);

  if (endTime <= startTime) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { host: { select: { name: true, email: true } } },
  });
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Listing not available" }, { status: 404 });
  }

  // Check for overlapping pending/approved requests on this listing.
  const overlap = await prisma.booking.findFirst({
    where: {
      listingId,
      status: { in: ["PENDING", "APPROVED"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (overlap) {
    return NextResponse.json({ error: "That time is no longer available" }, { status: 409 });
  }

  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const totalPrice = priceForHours(
    hours,
    listing.pricePerHour,
    listing.discountThresholdHours,
    listing.discountPercent
  );

  const booking = await prisma.booking.create({
    data: {
      listingId,
      renterId: session.user.id,
      startTime,
      endTime,
      guests,
      totalPrice,
      status: "PENDING",
    },
  });

  // Ensure a conversation exists between renter and host for this listing
  // so they can coordinate details, deposits, and payment directly.
  await prisma.conversation.upsert({
    where: { listingId_renterId: { listingId, renterId: session.user.id } },
    create: {
      listingId,
      renterId: session.user.id,
      hostId: listing.hostId,
    },
    update: {},
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const { subject, html } = bookingRequestEmail({
    hostName: listing.host.name,
    renterName: session.user.name ?? "A renter",
    listingTitle: listing.title,
    startTime,
    endTime,
    listingUrl: `${baseUrl}/host/dashboard`,
  });
  await sendEmail({ to: listing.host.email, subject, html });

  return NextResponse.json(booking);
}
