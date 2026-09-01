import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ hostId: session.user.id }, { renterId: session.user.id }],
    },
    include: {
      listing: { select: { title: true } },
      host: { select: { id: true, name: true } },
      renter: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Messages</h1>
      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        <div className="divide-y border rounded-xl bg-white">
          {conversations.map((c) => {
            const otherParty = c.hostId === session.user.id ? c.renter : c.host;
            const lastMessage = c.messages[0];
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{c.listing.title}</p>
                  <p className="text-sm text-gray-500">
                    with {otherParty.name}
                    {lastMessage ? ` — ${lastMessage.body.slice(0, 50)}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
