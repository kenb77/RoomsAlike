import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BookingActions from "@/components/BookingActions";
import ManageBillingButton from "@/components/ManageBillingButton";
import BookingCalendar from "@/components/BookingCalendar";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-red-100 text-red-700",
};

const bookingStatusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const subscriptionStatusLabel: Record<string, string> = {
  ACTIVE: "Billing active",
  PAST_DUE: "Payment failed — update your card",
  CANCELED: "Subscription canceled",
  INCOMPLETE: "Payment pending",
};

export default async function HostDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  const listings = await prisma.listing.findMany({
    where: { hostId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      bookings: {
        include: { renter: { select: { name: true } } },
        orderBy: { startTime: "asc" },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your listings</h1>
        <Link
          href="/host/listings/new"
          className="rounded-full bg-rose-600 text-white px-4 py-2 font-medium hover:bg-rose-700"
        >
          + New listing
        </Link>
      </div>

      {user?.idVerificationStatus !== "VERIFIED" && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          Your ID isn&apos;t verified yet —{" "}
          <Link href="/verify" className="underline font-medium">
            verify it
          </Link>{" "}
          before posting a listing.
        </p>
      )}

      {listings.length === 0 ? (
        <p className="text-gray-500">
          You haven&apos;t posted any listings yet.
        </p>
      ) : (
        <div className="space-y-6">
          {listings.map((listing) => (
            <div key={listing.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{listing.title}</p>
                  <p className="text-sm text-gray-500">
                    {listing.city} · ${listing.pricePerHour}/hour
                  </p>
                  {listing.subscription && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {subscriptionStatusLabel[listing.subscription.status]}
                      {listing.subscription.currentPeriodEnd &&
                        listing.subscription.status === "ACTIVE" &&
                        ` · renews ${new Date(listing.subscription.currentPeriodEnd).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${statusStyles[listing.status]}`}
                  >
                    {listing.status.replace("_", " ")}
                  </span>
                  {(listing.status === "PENDING_PAYMENT" || listing.status === "INACTIVE") && (
                    <Link
                      href={`/host/listings/${listing.id}/pay`}
                      className="text-sm rounded-full bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700"
                    >
                      {listing.subscription ? "Resubscribe" : "Pay to activate"}
                    </Link>
                  )}
                  {listing.status === "ACTIVE" && (
                    <>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-sm rounded-full border px-3 py-1.5 hover:shadow"
                      >
                        View
                      </Link>
                      <ManageBillingButton />
                    </>
                  )}
                </div>
              </div>

              {listing.bookings.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase">Requests</p>
                  {listing.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{b.renter.name}</span>{" "}
                        <span className="text-gray-500">
                          {new Date(b.startTime).toLocaleDateString()}{" "}
                          {new Date(b.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {new Date(b.endTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          {" · ~$"}
                          {b.totalPrice.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${bookingStatusStyles[b.status]}`}
                        >
                          {b.status}
                        </span>
                        {b.status === "PENDING" && <BookingActions bookingId={b.id} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {listing.bookings.some((b) => b.status !== "CANCELLED") && (
                <details className="mt-4 pt-4 border-t">
                  <summary className="text-xs font-medium text-gray-400 uppercase cursor-pointer select-none">
                    Calendar view
                  </summary>
                  <div className="mt-3 max-w-sm">
                    <BookingCalendar
                      listingId={listing.id}
                      pricePerHour={listing.pricePerHour}
                      discountThresholdHours={listing.discountThresholdHours}
                      discountPercent={listing.discountPercent}
                      bookedRanges={[]}
                      isOwnListing
                      isLoggedIn
                      isIdVerified={user?.idVerificationStatus === "VERIFIED"}
                      sticky={false}
                      hostBookings={listing.bookings
                        .filter((b) => b.status !== "CANCELLED")
                        .map((b) => ({
                          id: b.id,
                          renterName: b.renter.name,
                          startTime: b.startTime.toISOString(),
                          endTime: b.endTime.toISOString(),
                          status: b.status,
                          totalPrice: b.totalPrice,
                          guests: b.guests,
                          depositNote: b.depositNote,
                        }))}
                    />
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
