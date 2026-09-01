import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_POST_FEE_CENTS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [listings, activeSubscriptions, users, bookings, reviews, verifiedUsers] = await Promise.all([
    prisma.listing.findMany({
      include: { host: { select: { name: true, email: true } }, subscription: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.booking.count(),
    prisma.review.count(),
    prisma.user.count({ where: { idVerificationStatus: "VERIFIED" } }),
  ]);

  const monthlyRecurringRevenueCents = activeSubscriptions * LISTING_POST_FEE_CENTS;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Admin</h1>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-8">
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">Total users</p>
          <p className="text-2xl font-semibold">{users}</p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">Total listings</p>
          <p className="text-2xl font-semibold">{listings.length}</p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">Total bookings</p>
          <p className="text-2xl font-semibold">{bookings}</p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">Reviews left</p>
          <p className="text-2xl font-semibold">{reviews}</p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">Monthly recurring revenue</p>
          <p className="text-2xl font-semibold">${(monthlyRecurringRevenueCents / 100).toFixed(2)}</p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">ID verified users</p>
          <p className="text-2xl font-semibold">{verifiedUsers} / {users}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Listings</h2>
      <div className="border rounded-xl bg-white overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Host</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2">{l.title}</td>
                <td className="px-4 py-2 text-gray-500">{l.host.email}</td>
                <td className="px-4 py-2">{l.status}</td>
                <td className="px-4 py-2">
                  {l.subscription
                    ? `${l.subscription.status}${
                        l.subscription.currentPeriodEnd
                          ? ` · renews ${new Date(l.subscription.currentPeriodEnd).toLocaleDateString()}`
                          : ""
                      }`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
