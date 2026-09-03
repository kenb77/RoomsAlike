import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { geocode } from "@/lib/geocode";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().max(50).nullable().optional(),
  pricePerHour: z.number().positive(),
  pricePerDay: z.number().positive().nullable().optional(),
  discountThresholdHours: z.number().int().positive().nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  maxGuests: z.number().int().positive().default(2),
  photos: z.array(z.string()).max(4).default([]),
  amenities: z.array(z.string()).default([]),
  cancellationPolicy: z.string().max(2000).nullable().optional(),
  refundPolicy: z.string().max(2000).nullable().optional(),
});

// GET /api/listings -> public list of ACTIVE listings (optionally filtered by city / price)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? undefined;
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(minPrice ? { pricePerHour: { gte: Number(minPrice) } } : {}),
      ...(maxPrice ? { pricePerHour: { lte: Number(maxPrice) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { host: { select: { name: true } } },
  });

  return NextResponse.json(listings);
}

// POST /api/listings -> host creates a draft listing (unpaid, not yet visible)
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only hosts can create listings" }, { status: 403 });
  }

  // ID verification is optional (a trust signal, not a requirement) — hosts
  // can post listings without it.
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Best-effort geocoding so the listing shows up in distance-based search.
  // If it fails (rate limit, bad address, network), the listing is still created —
  // it just won't be findable by "search near me" until re-geocoded.
  const point = await geocode(`${parsed.data.address}, ${parsed.data.city}`);

  const listing = await prisma.listing.create({
    data: {
      ...parsed.data,
      hostId: session.user.id,
      status: "PENDING_PAYMENT",
      latitude: point?.latitude,
      longitude: point?.longitude,
    },
  });

  return NextResponse.json(listing);
}
