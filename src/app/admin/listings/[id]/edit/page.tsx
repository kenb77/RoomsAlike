import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminEditListingForm from "@/components/AdminEditListingForm";

export const dynamic = "force-dynamic";

export default async function AdminEditListingPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { host: { select: { name: true, email: true } } },
  });
  if (!listing) notFound();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Edit listing</h1>
      <p className="text-sm text-gray-500 mb-6">
        Host: {listing.host.name} ({listing.host.email}) &middot; Status: {listing.status}
      </p>
      <AdminEditListingForm
        listingId={listing.id}
        initial={{
          title: listing.title,
          description: listing.description,
          address: listing.address,
          city: listing.city,
          state: listing.state,
          pricePerHour: listing.pricePerHour,
          pricePerDay: listing.pricePerDay,
          maxGuests: listing.maxGuests,
          discountThresholdHours: listing.discountThresholdHours,
          discountPercent: listing.discountPercent,
          cancellationPolicy: listing.cancellationPolicy,
          refundPolicy: listing.refundPolicy,
          photos: listing.photos,
          amenities: listing.amenities,
        }}
      />
    </div>
  );
}
