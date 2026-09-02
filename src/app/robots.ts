import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/account-specific pages and API routes out of search results.
      disallow: [
        "/api/",
        "/admin",
        "/host/dashboard",
        "/host/listings/",
        "/bookings",
        "/messages",
        "/verify",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
