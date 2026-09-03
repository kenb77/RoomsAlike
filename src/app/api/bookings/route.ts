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
  bookingType: z.enum(["HOURLY", "DAILY"]).default("HOURLY"),
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

  // ID verification is optional (a trust signal, not a requirement) — renters
  // can request bookings without it.
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { listingId, guests, bookingType } = parsed.data;
  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);

  if (endTime <= startTime) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  if (bookingType === "HOURLY") {
    // Hourly bookings can span multiple days (priced by total elapsed
    // hours) — the under-24h cap only applies when start and end land on
    // the same calendar day, so it doesn't collide with a full-day booking.
    const sameCalendarDay = startTime.toISOString().slice(0, 10) === endTime.toISOString().slice(0, 10);
    if (sameCalendarDay && durationHours >= 24) {
      return NextResponse.json(
        { error: "A same-day booking must be under 24 hours. Pick a date range for multi-day bookings." },
        { status: 400 }
      );
    }
  } else {
    // A daily booking must be in whole-day (24h) increments.
    if (Math.abs(durationHours - Math.round(durationHours / 24) * 24) > 0.01) {
      return NextResponse.json(
        { error: "A daily booking must be in full-day increments." },
        { status: 400 }
      );
    }
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { host: { select: { name: true, email: true } } },
  });
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Listing not available" }, { status: 404 });
  }

  if (bookingType === "DAILY" && listing.pricePerDay == null) {
    return NextResponse.json({ error: "This listing doesn't offer daily rates" }, { status: 400 });
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

  const totalPrice =
    bookingType === "DAILY"
      ? Math.round(Math.round(durationHours / 24) * listing.pricePerDay! * 100) / 100
      : priceForHours(durationHours, listing.pricePerHour, listing.discountThresholdHours, listing.discountPercent);

  const booking = await prisma.booking.create({
    data: {
      listingId,
      renterId: session.user.id,
      startTime,
      endTime,
      guests,
      totalPrice,
      status: "PENDING",
      bookingType,
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
