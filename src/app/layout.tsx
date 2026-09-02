import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import Navbar from "@/components/Navbar";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RoomsAlike — Rent your place, book a stay",
    template: "%s — RoomsAlike",
  },
  description:
    "Browse hourly and multi-day space rentals near you, or list your own space and get paid — no platform fees on bookings, hosts pay a simple monthly listing fee.",
  openGraph: {
    title: "RoomsAlike — Rent your place, book a stay",
    description:
      "Browse hourly and multi-day space rentals near you, or list your own space and get paid.",
    url: siteUrl,
    siteName: "RoomsAlike",
    images: ["/icon.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RoomsAlike — Rent your place, book a stay",
    description:
      "Browse hourly and multi-day space rentals near you, or list your own space and get paid.",
    images: ["/icon.png"],
  },
  // Set GOOGLE_SITE_VERIFICATION in your env once you have a code from
  // Google Search Console (Settings > Ownership verification > HTML tag) —
  // no code change needed, it just needs the env var to appear in <head>.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">
        <SessionProviderWrapper>
          <Navbar />
          <main>{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
