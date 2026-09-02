import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const adapter = new PrismaPg({
  connectionString,
  // Hosted Postgres (Neon, Supabase, RDS, etc.) requires SSL; local docker Postgres doesn't.
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
