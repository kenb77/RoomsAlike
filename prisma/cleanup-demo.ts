import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const adapter = new PrismaPg({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

// One-time cleanup for the demo accounts/listings created by prisma/seed.ts.
// Safe to run against the live/shared database once you're done testing and
// ready for real users — it only ever touches these specific demo emails,
// nothing else.
const DEMO_EMAILS = ["host@stayhaven.dev", "renter@stayhaven.dev", "admin@stayhaven.dev"];

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
  });

  if (demoUsers.length === 0) {
    console.log("No demo accounts found — nothing to clean up.");
    return;
  }

  const demoUserIds = demoUsers.map((u) => u.id);

  const demoListings = await prisma.listing.findMany({
    where: { hostId: { in: demoUserIds } },
    select: { id: true },
  });
  const listingIds = demoListings.map((l) => l.id);

  const demoBookings = await prisma.booking.findMany({
    where: {
      OR: [{ listingId: { in: listingIds } }, { renterId: { in: demoUserIds } }],
    },
    select: { id: true },
  });
  const bookingIds = demoBookings.map((b) => b.id);

  const demoConversations = await prisma.conversation.findMany({
    where: {
      OR: [{ listingId: { in: listingIds } }, { hostId: { in: demoUserIds } }, { renterId: { in: demoUserIds } }],
    },
    select: { id: true },
  });
  const conversationIds = demoConversations.map((c) => c.id);

  // Delete in dependency order (children before parents).
  await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  await prisma.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.hostReview.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.quickReply.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.subscription.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });

  console.log(`Removed ${demoUsers.length} demo account(s), ${listingIds.length} demo listing(s),`);
  console.log(`${bookingIds.length} demo booking(s), and ${conversationIds.length} demo conversation(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
