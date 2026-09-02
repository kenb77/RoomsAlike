import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quickReply = await prisma.quickReply.findUnique({
    where: { id: params.id },
    include: { listing: true },
  });
  if (!quickReply) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quickReply.listing.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.quickReply.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
