import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_POST_FEE_CENTS } from "@/lib/stripe";
import AdminListingReviewActions from "@/components/AdminListingReviewActions";

export const dynamic = "force-dynamic";

const subscriptionStatusLabel: Record<string, string> = {
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [
    listings,
    pendingListings,
    subscriptionsByStatus,
    users,
    bookings,
    reviews,
    verifiedUsers,
    totalViews,
  ] = await Promise.all([
    prisma.listing.findMany({
      include: { host: { select: { name: true, email: true } }, subscription: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listing.findMany({
      where: { status: "PENDING_REVIEW" },
      include: { host: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subscription.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.user.count(),
    prisma.booking.count(),
    prisma.review.count(),
    prisma.user.count({ where: { idVerificationStatus: "VERIFIED" } }),
    prisma.listing.aggregate({ _sum: { viewCount: true } }),
  ]);

  const activeSubscriptions =
    subscriptionsByStatus.find((s) => s.status === "ACTIVE")?._count.status ?? 0;
  const monthlyRecurringRevenueCents = activeSubscriptions * LISTING_POST_FEE_CENTS;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Link href="/admin/conversations" className="text-sm text-rose-600 hover:underline">
          View all conversations →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
          <p className="text-2xl font-semibold">
            {verifiedUsers} / {users}
          </p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase">Total listing views</p>
          <p className="text-2xl font-semibold">{totalViews._sum.viewCount ?? 0}</p>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <p className="text-xs text-gray-400 uppercase mb-1">Subscriptions</p>
          <div className="text-xs space-y-0.5">
            {(["ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED"] as const).map((s) => {
              const count = subscriptionsByStatus.find((x) => x.status === s)?._count.status ?? 0;
              return (
                <p key={s} className="flex justify-between">
                  <span className="text-gray-500">{subscriptionStatusLabel[s]}</span>
                  <span className="font-medium">{count}</span>
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {pendingListings.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">
            Pending review ({pendingListings.length})
          </h2>
          <div className="border rounded-xl bg-white overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Host</th>
                  <th className="px-4 py-2">Photos</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingListings.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2">
                      <Link href={`/listings/${l.id}`} className="hover:underline">
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{l.host.email}</td>
                    <td className="px-4 py-2 text-gray-500">{l.photos.length}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/listings/${l.id}/edit`}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Edit
                        </Link>
                        <AdminListingReviewActions listingId={l.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold mb-3">Listings</h2>
      <div className="border rounded-xl bg-white overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Host</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Views</th>
              <th className="px-4 py-2">Subscription</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2">{l.title}</td>
                <td className="px-4 py-2 text-gray-500">{l.host.email}</td>
                <td className="px-4 py-2">{l.status}</td>
                <td className="px-4 py-2">{l.viewCount}</td>
                <td className="px-4 py-2">
                  {l.subscription
                    ? `${l.subscription.status}${
                        l.subscription.currentPeriodEnd
                          ? ` · renews ${new Date(l.subscription.currentPeriodEnd).toLocaleDateString()}`
                          : ""
                      }`
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/listings/${l.id}/edit`}
                    className="text-rose-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
