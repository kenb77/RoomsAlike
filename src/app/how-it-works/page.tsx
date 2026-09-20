import Link from "next/link";

export const metadata = {
  title: "How it works | RoomsAlike",
  description:
    "How RoomsAlike works for renters and hosts — browsing, booking requests, messaging, and reviews.",
};

const renterSteps = [
  {
    title: "Browse nearby spaces",
    body: "Search by location and see what's around you — lofts, studios, rooms, and more, each with an hourly rate and, on many listings, a day rate too.",
  },
  {
    title: "Request a time that works",
    body: "Pick a start and end time for a few hours, or select a range of full days if the host offers a daily rate. See real availability before you request.",
  },
  {
    title: "Wait for the host to confirm",
    body: "Every request goes to the host first. Once they approve it, the dates are locked in and you're set.",
  },
  {
    title: "Coordinate directly",
    body: "Use the built-in messages to work out any details with your host — access instructions, a deposit, or anything else specific to the space.",
  },
  {
    title: "Leave a review",
    body: "After your booking, you and the host each leave a review. Reviews only go public once both sides have submitted theirs, so nobody's rating a review instead of the stay.",
  },
];

const hostSteps = [
  {
    title: "List your space",
    body: "Add photos, a description, your hourly rate, and an optional day rate with your own check-in and check-out times. Lay out house rules up front so renters know what to expect.",
  },
  {
    title: "Get reviewed by an admin",
    body: "New listings are checked before they go live, and a small monthly subscription keeps your listing active — no per-booking commission on top.",
  },
  {
    title: "Approve requests as they come in",
    body: "You choose who books your space. Review each request and approve the ones that work for your schedule.",
  },
  {
    title: "Handle payment your way",
    body: "RoomsAlike doesn't process booking payments. Arrange payment or a deposit directly with your renter through messages, however you two agree.",
  },
  {
    title: "Build a track record",
    body: "Every completed booking is a chance for a review. A solid history helps your listing stand out to future renters.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold text-gray-900 text-center mb-3">
        How RoomsAlike works
      </h1>
      <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
        A straightforward way to rent out a space, or find one nearby, without
        long-term leases or platform fees on your payment.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-14">
        <div>
          <h2 className="text-lg font-semibold text-royal-600 mb-4">For renters</h2>
          <ol className="space-y-5">
            {renterSteps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="shrink-0 h-7 w-7 rounded-full bg-royal-50 text-royal-600 text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-royal-600 mb-4">For hosts</h2>
          <ol className="space-y-5">
            {hostSteps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="shrink-0 h-7 w-7 rounded-full bg-royal-50 text-royal-600 text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border-t pt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">
          Payments and deposits happen directly between renters and hosts —
          RoomsAlike isn&apos;t involved in moving money, so there&apos;s nothing
          taken out of your booking.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-royal-600 text-white px-5 py-2 text-sm hover:bg-royal-700"
          >
            Browse spaces
          </Link>
          <Link
            href="/host/listings/new"
            className="rounded-full border px-5 py-2 text-sm hover:shadow"
          >
            List your space
          </Link>
        </div>
      </div>
    </div>
  );
}
