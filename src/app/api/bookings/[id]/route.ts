import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, bookingStatusEmail } from "@/lib/email";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]).optional(),
  depositNote: z.string().max(500).nullable().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

function priceForHours(hours: number, pricePerHour: number, discountThresholdHours: number | null, discountPercent: number | null) {
  let total = hours * pricePerHour;
  if (discountThresholdHours != null && discountPercent != null && hours >= discountThresholdHours) {
    total = total * (1 - discountPercent / 100);
  }
  return Math.round(total * 100) / 100;
}

function formatDateTime(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

async function postSystemMessage(listingId: string, renterId: string, senderId: string, body: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { listingId_renterId: { listingId, renterId } },
  });
  if (!conversation) return;
  await prisma.message.create({
    data: { conversationId: conversation.id, senderId, body, system: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, depositNote, startTime: startTimeStr, endTime: endTimeStr } = parsed.data;
  if (status === undefined && depositNote === undefined && startTimeStr === undefined && endTimeStr === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { listing: true, renter: { select: { name: true, email: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isHost = booking.listing.hostId === session.user.id;
  const isRenter = booking.renterId === session.user.id;
  if (!isHost && !isRenter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorName = session.user.name ?? (isHost ? "Host" : "Renter");
  const data: {
    status?: "APPROVED" | "CANCELLED";
    depositNote?: string | null;
    startTime?: Date;
    endTime?: Date;
    totalPrice?: number;
  } = {};
  const notices: string[] = [];

  if (status !== undefined) {
    if (status === "APPROVED") {
      if (!isHost) {
        return NextResponse.json({ error: "Only the host can approve a booking" }, { status: 403 });
      }
      if (booking.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 400 });
      }
      notices.push(`${actorName} approved this booking request.`);
    }
    if (status === "CANCELLED") {
      if (booking.status === "CANCELLED") {
        return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
      }
      notices.push(`${actorName} cancelled this booking. The dates are now open again.`);
    }
    data.status = status;
  }

  if (depositNote !== undefined) {
    // Deposit terms are private, host-side notes about an off-platform
    // arrangement — only the host of the listing can set them.
    if (!isHost) {
      return NextResponse.json({ error: "Only the host can set the deposit note" }, { status: 403 });
    }
    data.depositNote = depositNote;
  }

  if (startTimeStr !== undefined || endTimeStr !== undefined) {
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Can't edit a cancelled booking" }, { status: 400 });
    }
    const newStart = startTimeStr ? new Date(startTimeStr) : booking.startTime;
    const newEnd = endTimeStr ? new Date(endTimeStr) : booking.endTime;

    if (newEnd <= newStart) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const overlap = await prisma.booking.findFirst({
      where: {
        listingId: booking.listingId,
        id: { not: booking.id },
        status: { in: ["PENDING", "APPROVED"] },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });
    if (overlap) {
      return NextResponse.json({ error: "That new time overlaps another booking" }, { status: 409 });
    }

    const hours = (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60);
    const totalPrice = priceForHours(
      hours,
      booking.listing.pricePerHour,
      booking.listing.discountThresholdHours,
      booking.listing.discountPercent
    );

    data.startTime = newStart;
    data.endTime = newEnd;
    data.totalPrice = totalPrice;

    notices.push(
      `${actorName} updated this booking: now ${formatDateTime(newStart)} – ${formatDateTime(newEnd)} (was ${formatDateTime(booking.startTime)} – ${formatDateTime(booking.endTime)}).`
    );
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data,
  });

  for (const notice of notices) {
    await postSystemMessage(booking.listingId, booking.renterId, session.user.id, notice);
  }

  // Only notify the renter when the host is the one who changed the status —
  // no need to email someone about their own action.
  if (isHost && (status === "APPROVED" || status === "CANCELLED")) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const { subject, html } = bookingStatusEmail({
      renterName: booking.renter.name,
      listingTitle: booking.listing.title,
      status,
      listingUrl: `${baseUrl}/bookings`,
    });
    await sendEmail({ to: booking.renter.email, subject, html });
  }

  return NextResponse.json(updated);
}
