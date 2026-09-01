import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const adapter = new PrismaPg({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

function photos(seed: string, count = 2) {
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/900/600`);
}

const demoListings = [
  {
    seed: "loft-austin",
    title: "Cozy Downtown Loft",
    description:
      "A bright, comfortable loft steps from the city center. Great for meetups, shoots, or a few quiet hours of work.",
    address: "123 Main St",
    city: "Austin",
    latitude: 30.2672,
    longitude: -97.7431,
    pricePerHour: 25,
    discountThresholdHours: 6,
    discountPercent: 15,
    maxGuests: 3,
  },
  {
    seed: "cabin-asheville",
    title: "Mountain View Cabin",
    description:
      "A quiet wooden cabin tucked into the hills, perfect for a retreat or small gathering. Wraparound porch and fire pit.",
    address: "48 Ridgeline Rd",
    city: "Asheville",
    latitude: 35.5951,
    longitude: -82.5515,
    pricePerHour: 20,
    discountThresholdHours: 4,
    discountPercent: 10,
    maxGuests: 4,
  },
  {
    seed: "condo-miami",
    title: "Beachfront Condo",
    description:
      "A sunlit condo just steps from the sand, with a private balcony — great for a half-day photo shoot or event.",
    address: "900 Ocean Dr",
    city: "Miami",
    latitude: 25.7617,
    longitude: -80.1918,
    pricePerHour: 45,
    discountThresholdHours: 8,
    discountPercent: 20,
    maxGuests: 4,
  },
  {
    seed: "brownstone-brooklyn",
    title: "Charming Brooklyn Brownstone Room",
    description:
      "A quiet, classic room in a Brooklyn brownstone — good for a small workshop or a few hours of focused work.",
    address: "212 Vine St",
    city: "Brooklyn",
    latitude: 40.6782,
    longitude: -73.9442,
    pricePerHour: 18,
    discountThresholdHours: null,
    discountPercent: null,
    maxGuests: 2,
  },
  {
    seed: "bungalow-portland",
    title: "Craftsman Bungalow with Garden",
    description:
      "A restored 1920s bungalow with a lush backyard garden — a favorite for small events and gatherings.",
    address: "77 Elm Ave",
    city: "Portland",
    latitude: 45.5152,
    longitude: -122.6784,
    pricePerHour: 22,
    discountThresholdHours: 5,
    discountPercent: 10,
    maxGuests: 3,
  },
  {
    seed: "studio-chicago",
    title: "Modern Studio Near the Loop",
    description:
      "A sleek, minimalist studio with skyline views, walking distance to downtown Chicago.",
    address: "1500 Lake Shore Dr",
    city: "Chicago",
    latitude: 41.8781,
    longitude: -87.6298,
    pricePerHour: 30,
    discountThresholdHours: 6,
    discountPercent: 12,
    maxGuests: 2,
  },
];

async function main() {
  // update is intentionally non-empty on all three of these — re-running the
  // seed always resets these demo accounts back to the documented
  // credentials, even if they already exist from an earlier run/version.
  const adminPassword = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@stayhaven.dev" },
    update: { password: adminPassword, role: "ADMIN" },
    create: {
      name: "Admin",
      email: "admin@stayhaven.dev",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const hostPassword = await bcrypt.hash("host1234", 10);
  const host = await prisma.user.upsert({
    where: { email: "host@stayhaven.dev" },
    update: { password: hostPassword, role: "HOST", idVerificationStatus: "VERIFIED" },
    create: {
      name: "Sam Host",
      email: "host@stayhaven.dev",
      password: hostPassword,
      role: "HOST",
      idVerificationStatus: "VERIFIED",
    },
  });

  const renterPassword = await bcrypt.hash("renter1234", 10);
  const renter = await prisma.user.upsert({
    where: { email: "renter@stayhaven.dev" },
    update: { password: renterPassword, role: "RENTER", idVerificationStatus: "VERIFIED" },
    create: {
      name: "Rina Renter",
      email: "renter@stayhaven.dev",
      password: renterPassword,
      role: "RENTER",
      idVerificationStatus: "VERIFIED",
    },
  });

  const createdListings: { id: string; seed: string }[] = [];

  for (const listing of demoListings) {
    let record = await prisma.listing.findFirst({
      where: { hostId: host.id, title: listing.title },
    });

    if (!record) {
      record = await prisma.listing.create({
        data: {
          hostId: host.id,
          title: listing.title,
          description: listing.description,
          address: listing.address,
          city: listing.city,
          latitude: listing.latitude,
          longitude: listing.longitude,
          pricePerHour: listing.pricePerHour,
          discountThresholdHours: listing.discountThresholdHours,
          discountPercent: listing.discountPercent,
          maxGuests: listing.maxGuests,
          photos: photos(listing.seed),
          status: "ACTIVE",
          subscription: {
            create: {
              stripeCustomerId: `seed_cus_${listing.seed}`,
              stripeSubscriptionId: `seed_sub_${listing.seed}`,
              status: "ACTIVE",
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
    }

    createdListings.push({ id: record.id, seed: listing.seed });
  }

  // Seed one completed, approved, reviewed booking so the review UI has something to show.
  const firstListing = createdListings[0];
  if (firstListing) {
    const existingBooking = await prisma.booking.findFirst({
      where: { listingId: firstListing.id, renterId: renter.id },
    });

    if (!existingBooking) {
      const start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start);
      end.setHours(14, 0, 0, 0);

      const booking = await prisma.booking.create({
        data: {
          listingId: firstListing.id,
          renterId: renter.id,
          startTime: start,
          endTime: end,
          guests: 2,
          totalPrice: 100,
          status: "APPROVED",
        },
      });

      await prisma.review.create({
        data: {
          bookingId: booking.id,
          listingId: firstListing.id,
          renterId: renter.id,
          rating: 5,
          comment: "Great space, host was easy to coordinate with. Would book again!",
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Created/verified ${demoListings.length} demo listings.`);
  console.log("Admin login:  admin@stayhaven.dev / admin1234");
  console.log("Host login:   host@stayhaven.dev / host1234 (ID pre-verified)");
  console.log("Renter login: renter@stayhaven.dev / renter1234 (ID pre-verified)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
