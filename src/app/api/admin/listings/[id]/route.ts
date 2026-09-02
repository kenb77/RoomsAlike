import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, listingReviewedEmail } from "@/lib/email";

// Admin-only: approve/reject a pending listing, and/or directly edit any of
// its fields (used by the admin dashboard's "edit listing" screen).
const patchSchema = z.object({
  action: z.enum(["approve", "reject"]).optional(),
  rejectionReason: z.string().max(1000).nullable().optional(),
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  address: z.string().min(3).optional(),
  city: z.string().min(2).optional(),
  pricePerHour: z.number().positive().optional(),
  discountThresholdHours: z.number().int().positive().nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  maxGuests: z.number().int().positive().optional(),
  photos: z.array(z.string()).max(4).optional(),
  amenities: z.array(z.string()).optional(),
  cancellationPolicy: z.string().max(2000).nullable().optional(),
  refundPolicy: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { host: { select: { name: true, email: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action, rejectionReason, ...editFields } = parsed.data;

  const data: Record<string, unknown> = { ...editFields };

  if (action === "approve") {
    data.status = "ACTIVE";
    data.approvedAt = new Date();
    data.rejectionReason = null;
  } else if (action === "reject") {
    data.status = "INACTIVE";
    data.approvedAt = null;
    data.rejectionReason = rejectionReason ?? null;
  }

  const updated = await prisma.listing.update({
    where: { id: params.id },
    data,
  });

  if (action) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const { subject, html } = listingReviewedEmail({
      hostName: listing.host.name,
      listingTitle: updated.title,
      approved: action === "approve",
      rejectionReason: action === "reject" ? rejectionReason : undefined,
      listingUrl: `${baseUrl}/host/dashboard`,
    });
    await sendEmail({ to: listing.host.email, subject, html });
  }

  return NextResponse.json(updated);
}
