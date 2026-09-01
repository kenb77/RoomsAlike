import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import BookingCalendar from "@/components/BookingCalendar";
import MessageHostButton from "@/components/MessageHostButton";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true } },
      bookings: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          totalPrice: true,
          guests: true,
          depositNote: true,
          renter: { select: { name: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { renter: { select: { name: true } } },
      },
    },
  });

  if (!listing) notFound();

  const isOwner = session?.user.id === listing.hostId;
  const isAdmin = session?.user.role === "ADMIN";
  if (listing.status !== "ACTIVE" && !isOwner && !isAdmin) notFound();

  const avgRating =
    listing.reviews.length > 0
      ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length
      : null;

  const currentUser = session
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="aspect-[16/9] bg-gray-100 rounded-xl mb-6 flex items-center justify-center text-gray-400">
          {listing.photos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover rounded-xl" />
          ) : (
            "No photo"
          )}
        </div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-2xl font-semibold">{listing.title}</h1>
          {avgRating != null && (
            <span className="shrink-0 text-sm text-gray-700 mt-1">
              ★ {avgRating.toFixed(1)}{" "}
              <span className="text-gray-400">({listing.reviews.length})</span>
            </span>
          )}
        </div>
        <p className="text-gray-500 mb-4">
          {listing.city} · Hosted by {listing.host.name}
        </p>
        <p className="text-gray-700 whitespace-pre-line mb-6">{listing.description}</p>
        <p className="text-sm text-gray-500 mb-6">Up to {listing.maxGuests} people</p>

        {!isOwner && session && (
          <MessageHostButton listingId={listing.id} />
        )}

        <div className="mt-10 pt-6 border-t">
          <h2 className="text-lg font-semibold mb-4">
            {listing.reviews.length > 0
              ? `${listing.reviews.length} review${listing.reviews.length > 1 ? "s" : ""}`
              : "No reviews yet"}
          </h2>
          {listing.reviews.length === 0 ? (
            <p className="text-sm text-gray-500">
              This listing hasn&apos;t had any completed, reviewed bookings yet.
            </p>
          ) : (
            <div className="space-y-4">
              {listing.reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{review.renter.name}</span>
                    <span className="text-amber-500 text-sm">
                      {"★".repeat(review.rating)}
                      <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <BookingCalendar
          listingId={listing.id}
          pricePerHour={listing.pricePerHour}
          discountThresholdHours={listing.discountThresholdHours}
          discountPercent={listing.discountPercent}
          bookedRanges={listing.bookings.map((b) => ({
            startTime: b.startTime.toISOString(),
            endTime: b.endTime.toISOString(),
          }))}
          isOwnListing={isOwner}
          isLoggedIn={!!session}
          isIdVerified={currentUser?.idVerificationStatus === "VERIFIED"}
          hostBookings={
            isOwner
              ? listing.bookings.map((b) => ({
                  id: b.id,
                  renterName: b.renter.name,
                  startTime: b.startTime.toISOString(),
                  endTime: b.endTime.toISOString(),
                  status: b.status,
                  totalPrice: b.totalPrice,
                  guests: b.guests,
                  depositNote: b.depositNote,
                }))
              : undefined
          }
        />
      </div>
    </div>
  );
}
