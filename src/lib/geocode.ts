// Geocoding via OpenStreetMap's Nominatim — free, no API key required.
// Usage policy: max ~1 request/second, and a descriptive User-Agent is required.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "stayhaven-app/1.0 (contact: admin@stayhaven.dev)";

export type GeoPoint = { latitude: number; longitude: number };

export async function geocode(query: string): Promise<GeoPoint | null> {
  if (!query.trim()) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      // Nominatim is a third-party free service; don't let a slow/down response hang the request.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;

    const { lat, lon } = results[0];
    return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
  } catch {
    // Geocoding is best-effort — listing creation / search should still work without it.
    return null;
  }
}

const EARTH_RADIUS_MILES = 3958.8;

// Great-circle distance between two lat/lng points, in miles.
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
