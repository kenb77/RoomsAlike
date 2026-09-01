import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/conversations -> all conversations for the logged in user (as host or renter)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ hostId: session.user.id }, { renterId: session.user.id }],
    },
    include: {
      listing: { select: { id: true, title: true } },
      host: { select: { id: true, name: true } },
      renter: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(conversations);
}

const createSchema = z.object({
  listingId: z.string(),
});

// POST /api/conversations -> renter starts (or fetches) a conversation with the host of a listing
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  if (listing.hostId === session.user.id) {
    return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      listingId_renterId: { listingId: listing.id, renterId: session.user.id },
    },
    create: {
      listingId: listing.id,
      renterId: session.user.id,
      hostId: listing.hostId,
    },
    update: {},
  });

  return NextResponse.json(conversation);
}
