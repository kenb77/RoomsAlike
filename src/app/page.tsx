import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ListingCard from "@/components/ListingCard";
import { geocode, distanceMiles } from "@/lib/geocode";

export const dynamic = "force-dynamic";

const RADIUS_OPTIONS = ["10", "25", "50", "100+"] as const;

type SearchParams = {
  location?: string;
  radius?: string;
  minPrice?: string;
  maxPrice?: string;
};

function avgRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return null;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { location, radius, minPrice, maxPrice } = searchParams;

  const priceFilter = {
    ...(minPrice ? { gte: Number(minPrice) } : {}),
    ...(maxPrice ? { lte: Number(maxPrice) } : {}),
  };

  const baseWhere: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    ...(Object.keys(priceFilter).length ? { pricePerHour: priceFilter } : {}),
  };

  let listings: Awaited<ReturnType<typeof fetchListings>>;
  let searchOrigin: { latitude: number; longitude: number } | null = null;
  let distanceById = new Map<string, number>();

  async function fetchListings(where: Prisma.ListingWhereInput) {
    return prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { name: true } },
        reviews: { select: { rating: true } },
      },
    });
  }

  if (location?.trim()) {
    searchOrigin = await geocode(location);

    if (searchOrigin) {
      // Distance search: pull every active listing with coordinates, filter by radius in app code.
      const candidates = await fetchListings({
        ...baseWhere,
        latitude: { not: null },
        longitude: { not: null },
      });

      const maxMiles = radius === "100+" ? Infinity : Number(radius ?? 50);

      const withDistance = candidates
        .map((listing) => ({
          listing,
          miles: distanceMiles(searchOrigin!, {
            latitude: listing.latitude!,
            longitude: listing.longitude!,
          }),
        }))
        .filter((entry) => entry.miles <= maxMiles)
        .sort((a, b) => a.miles - b.miles);

      listings = withDistance.map((entry) => entry.listing);
      distanceById = new Map(withDistance.map((entry) => [entry.listing.id, entry.miles]));
    } else {
      // Couldn't geocode the search text — fall back to a plain city-name match.
      listings = await fetchListings({
        ...baseWhere,
        city: { contains: location, mode: "insensitive" },
      });
    }
  } else {
    listings = await fetchListings(baseWhere);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 text-center mb-6">
        Find a space to book
      </h1>

      <form
        action="/"
        className="mb-10 mx-auto max-w-2xl bg-white border border-gray-200 rounded-full shadow-sm flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-200 overflow-hidden"
      >
        <div className="flex-1 flex items-center gap-2 px-5 py-2.5">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-medium text-gray-400 tracking-wide">
              Where
            </label>
            <input
              name="location"
              placeholder="City, address, or zip"
              defaultValue={location}
              className="w-full border-0 p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
            />
          </div>
          <select
            name="radius"
            defaultValue={radius ?? "50"}
            className="shrink-0 border-0 bg-transparent text-sm text-gray-500 focus:outline-none focus:ring-0"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                within {r} mi
              </option>
            ))}
          </select>
        </div>

        <div className="p-2 flex items-center justify-center">
          <button
            aria-label="Search"
            className="rounded-full bg-rose-600 text-white p-3 hover:bg-rose-700 flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </form>

      {location?.trim() && !searchOrigin && (
        <p className="text-sm text-amber-600 mb-4 text-center">
          Couldn&apos;t pinpoint &quot;{location}&quot; on the map — showing city-name matches instead.
        </p>
      )}

      {listings.length === 0 ? (
        <p className="text-gray-600 text-center">No listings match your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              city={listing.city}
              pricePerHour={listing.pricePerHour}
              photos={listing.photos}
              hostName={listing.host.name}
              rating={avgRating(listing.reviews)}
              reviewCount={listing.reviews.length}
              distanceMiles={distanceById.get(listing.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
