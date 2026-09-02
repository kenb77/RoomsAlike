import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { id: true, title: true } },
      host: { select: { id: true, name: true, paymentInfo: true } },
      renter: { select: { id: true, name: true } },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.hostId !== session.user.id && conversation.renterId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isHost = conversation.hostId === session.user.id;

  let quickReplies: { id: string; title: string; body: string }[] = [];
  if (isHost) {
    quickReplies = await prisma.quickReply.findMany({
      where: { listingId: conversation.listingId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, body: true },
    });
  }

  return NextResponse.json({
    id: conversation.id,
    listingId: conversation.listingId,
    listingTitle: conversation.listing.title,
    isHost,
    otherPartyName: isHost ? conversation.renter.name : conversation.host.name,
    paymentInfo: isHost ? conversation.host.paymentInfo : null,
    quickReplies,
  });
}
