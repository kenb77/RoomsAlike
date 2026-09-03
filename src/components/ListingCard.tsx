import Link from "next/link";

type ListingCardProps = {
  id: string;
  title: string;
  city: string;
  state?: string | null;
  pricePerHour: number;
  pricePerDay?: number | null;
  photos: string[];
  hostName?: string;
  rating?: number | null;
  reviewCount?: number;
  distanceMiles?: number;
};

export default function ListingCard({
  id,
  title,
  city,
  state,
  pricePerHour,
  pricePerDay,
  photos,
  hostName,
  rating,
  reviewCount,
  distanceMiles,
}: ListingCardProps) {
  return (
    <Link
      href={`/listings/${id}`}
      className="block rounded-xl overflow-hidden border bg-white hover:shadow-lg transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        {photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[0]} alt={title} className="w-full h-full object-cover" />
        ) : (
          "No photo"
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium truncate">{title}</h3>
          {rating != null && (
            <span className="shrink-0 text-sm text-gray-700">
              ★ {rating.toFixed(1)}
              {reviewCount ? (
                <span className="text-gray-400"> ({reviewCount})</span>
              ) : null}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {city}
          {state && `, ${state}`}
          {distanceMiles != null && (
            <span className="text-gray-400"> · {distanceMiles.toFixed(1)} mi away</span>
          )}
        </p>
        {hostName && <p className="text-xs text-gray-400">Hosted by {hostName}</p>}
        <p className="mt-2 font-semibold">
          ${pricePerHour.toFixed(0)}{" "}
          <span className="font-normal text-gray-500">/ hour</span>
          {pricePerDay != null && (
            <span className="font-normal text-gray-400 text-sm"> · ${pricePerDay.toFixed(0)}/day</span>
          )}
        </p>
      </div>
    </Link>
  );
}
