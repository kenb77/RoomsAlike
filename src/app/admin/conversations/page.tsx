import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminConversationsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const conversations = await prisma.conversation.findMany({
    include: {
      listing: { select: { title: true } },
      host: { select: { name: true, email: true } },
      renter: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Conversations</h1>

      <div className="border rounded-xl bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Listing</th>
              <th className="px-4 py-2">Host</th>
              <th className="px-4 py-2">Renter</th>
              <th className="px-4 py-2">Messages</th>
              <th className="px-4 py-2">Last activity</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {conversations.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.listing.title}</td>
                <td className="px-4 py-2 text-gray-500">{c.host.name}</td>
                <td className="px-4 py-2 text-gray-500">{c.renter.name}</td>
                <td className="px-4 py-2">{c._count.messages}</td>
                <td className="px-4 py-2 text-gray-500">
                  {c.messages[0]
                    ? new Date(c.messages[0].createdAt).toLocaleString()
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/conversations/${c.id}`}
                    className="text-rose-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-400" colSpan={6}>
                  No conversations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
