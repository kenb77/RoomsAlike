import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function assertParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
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

  return NextResponse.json(message);
}
