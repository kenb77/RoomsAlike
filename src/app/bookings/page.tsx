import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaveReviewButton, EditRequestButton } from "@/components/RenterBookingActions";
import BookingActions from "@/components/BookingActions";
import MyBookingsCalendar from "@/components/MyBookingsCalendar";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  PENDING: "Awaiting host approval",
  APPROVED: "Approved — arrange payment with host",
  CANCELLED: "Cancelled",
};

export default async function BookingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { renterId: session.user.id },
    include: { listing: true, review: true, hostReview: true },
    orderBy: { startTime: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">My bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings yet.</p>
      ) : (
        <>
          <MyBookingsCalendar
            bookings={bookings.map((b) => ({
              id: b.id,
              startTime: b.startTime.toISOString(),
              endTime: b.endTime.toISOString(),
              status: b.status,
            }))}
          />
          <div className="space-y-4">
          {bookings.map((b) => {
            const isPast = b.status === "APPROVED" && b.endTime < new Date();
            const reviewEligible =
              b.status === "APPROVED" && new Date(b.endTime.getTime() + 24 * 60 * 60 * 1000) < new Date();
            const spansDays =
              new Date(b.startTime).toDateString() !== new Date(b.endTime).toDateString();
            return (
              <Link
                href={`/listings/${b.listingId}`}
                key={b.id}
                data-booking-id={b.id}
                className="block border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{b.listing.title}</p>
                    <p className="text-sm text-gray-500">
                      {spansDays ? (
                        <>
                          {new Date(b.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                          {new Date(b.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {new Date(b.endTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                          {new Date(b.endTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </>
                      ) : (
                        <>
                          {new Date(b.startTime).toLocaleDateString()}{" "}
                          {new Date(b.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {new Date(b.endTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </>
                      )}
                      {" · "}
                      {(() => {
                        const h = (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
                        return `${h} hour${h !== 1 ? "s" : ""}`;
                      })()}
                      {" · ~$"}
                      {b.totalPrice.toFixed(0)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full ${statusStyles[b.status]}`}>
                    {statusLabels[b.status]}
                  </span>
                </div>

                {b.status === "APPROVED" && !isPast && (
                  <p className="text-xs text-gray-500 mt-2">
                    Message the host to arrange the deposit and payment before your booking.
                  </p>
                )}

                <div className="mt-3 flex flex-col items-start gap-2">
                  {b.status === "PENDING" && (
                    <EditRequestButton
                      bookingId={b.id}
                      startTime={b.startTime.toISOString()}
                      endTime={b.endTime.toISOString()}
                    />
                  )}
                  {b.status !== "CANCELLED" && !isPast && (
                    <div onClick={(e) => e.preventDefault()}>
                      <BookingActions bookingId={b.id} status={b.status} canApprove={false} />
                    </div>
                  )}
                  {isPast && !reviewEligible && !b.review && (
                    <p className="text-xs text-gray-400">
                      You can review this booking starting 24 hours after it ends.
                    </p>
                  )}
                  {reviewEligible && !b.review && <LeaveReviewButton bookingId={b.id} />}
                  {b.review && (
                    <p className="text-xs text-gray-400">
                      You rated this booking {b.review.rating}★
                      {!b.review.visible && " (visible once the host also reviews you)"}
                    </p>
                  )}
                  {b.hostReview?.visible && (
                    <p className="text-xs text-gray-600">
                      Your host rated you {b.hostReview.rating}★ — &ldquo;{b.hostReview.comment}&rdquo;
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}
