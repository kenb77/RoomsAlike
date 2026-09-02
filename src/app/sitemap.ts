import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Regenerate on every request rather than freezing the listing list to
// whatever existed at the last deploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/register`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Only public, live listings belong in the sitemap.
  const listings = await prisma.listing
    .findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
    })
    .catch(() => []);

  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${siteUrl}/listings/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...listingRoutes];
}
