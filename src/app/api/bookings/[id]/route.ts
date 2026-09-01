import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]).optional(),
  depositNote: z.string().max(500).nullable().optional(),
});

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

  if (parsed.data.status === undefined && parsed.data.depositNote === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { listing: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isHost = booking.listing.hostId === session.user.id;
  const isRenter = booking.renterId === session.user.id;

  const data: { status?: "APPROVED" | "CANCELLED"; depositNote?: string | null } = {};

  if (parsed.data.status !== undefined) {
    if (parsed.data.status === "APPROVED") {
      if (!isHost) {
        return NextResponse.json({ error: "Only the host can approve a booking" }, { status: 403 });
      }
      if (booking.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 400 });
      }
    }
    if (parsed.data.status === "CANCELLED") {
      if (!isHost && !isRenter) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    data.status = parsed.data.status;
  }

  if (parsed.data.depositNote !== undefined) {
    // Deposit terms are private, host-side notes about an off-platform
    // arrangement — only the host of the listing can set them.
    if (!isHost) {
      return NextResponse.json({ error: "Only the host can set the deposit note" }, { status: 403 });
    }
    data.depositNote = parsed.data.depositNote;
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}
