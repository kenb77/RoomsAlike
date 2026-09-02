import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function assertHost(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.hostId !== userId) return null;
  return listing;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listing = await assertHost(params.id, session.user.id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quickReplies = await prisma.quickReply.findMany({
    where: { listingId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(quickReplies);
}

const createSchema = z.object({
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(1000),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listing = await assertHost(params.id, session.user.id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const quickReply = await prisma.quickReply.create({
    data: {
      listingId: params.id,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  return NextResponse.json(quickReply);
}
