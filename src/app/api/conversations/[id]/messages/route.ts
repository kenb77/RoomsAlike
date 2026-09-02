import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, newMessageEmail } from "@/lib/email";

async function assertParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: { select: { title: true } },
      host: { select: { id: true, name: true, email: true } },
      renter: { select: { id: true, name: true, email: true } },
    },
  });
  if (!conversation) return null;
  if (conversation.hostId !== userId && conversation.renterId !== userId) return null;
  return conversation;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await assertParticipant(params.id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true } } },
  });

  return NextResponse.json(messages);
}

const createSchema = z.object({ body: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await assertParticipant(params.id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: params.id,
      senderId: session.user.id,
      body: parsed.data.body,
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  const isSenderHost = conversation.hostId === session.user.id;
  const recipient = isSenderHost ? conversation.renter : conversation.host;
  const { subject, html } = newMessageEmail({
    recipientName: recipient.name,
    senderName: message.sender.name,
    listingTitle: conversation.listing.title,
    conversationUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/messages/${conversation.id}`,
  });
  await sendEmail({ to: recipient.email, subject, html });

  return NextResponse.json(message);
}
