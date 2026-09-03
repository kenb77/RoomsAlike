import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Read-only — admin can look at any conversation to spot problems, but this
// page has no message composer. Admin never posts into a host/renter chat.
export default async function AdminConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { title: true } },
      host: { select: { name: true, email: true } },
      renter: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });
  if (!conversation) notFound();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/admin/conversations" className="text-sm text-gray-500 hover:underline">
        &larr; Back to conversations
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-1">{conversation.listing.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Host: {conversation.host.name} ({conversation.host.email}) &middot; Renter:{" "}
        {conversation.renter.name} ({conversation.renter.email})
      </p>
      <p className="text-xs text-gray-400 mb-4">Read-only admin view. You can&apos;t post here.</p>

      <div className="border rounded-xl bg-white p-4 space-y-3">
        {conversation.messages.map((m) => {
          const isHostSender = m.sender.id === conversation.hostId;
          if (m.system) {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="max-w-[85%] rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs text-gray-500 text-center">
                  {m.body}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${isHostSender ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${
                  isHostSender ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-xs font-medium mb-0.5 opacity-80">{m.sender.name}</p>
                <p>{m.body}</p>
                <p className="text-[10px] opacity-60 mt-1">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        {conversation.messages.length === 0 && (
          <p className="text-sm text-gray-400">No messages yet.</p>
        )}
      </div>
    </div>
  );
}
