import { PrismaClient } from "@prisma/client";

const DEV_PLACEHOLDER_URLS = [
  "postgresql://postgres:postgres@localhost:5432/frigoai",
];

const isProdWithRealDb =
  process.env.NODE_ENV === "production" &&
  !!process.env.DATABASE_URL &&
  !DEV_PLACEHOLDER_URLS.includes(process.env.DATABASE_URL) &&
  !process.env.DATABASE_URL!.startsWith("pglite:");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPromise: Promise<PrismaClient> | undefined;
};

async function createPrismaClientDev(): Promise<PrismaClient> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PrismaPGlite } = await import("pglite-prisma-adapter");

  const pgClient = new PGlite({
    dataDir: "./db/frigoai-pgdata",
    options: { fsync: false },
  });
  await pgClient.waitReady?.catch(() => {});

  await seedPgliteDb(pgClient);

  const adapter = new PrismaPGlite(pgClient);
  return new PrismaClient({ adapter });
}

async function seedPgliteDb(pg: any): Promise<void> {
  const SQL = `
    CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
      phone TEXT NOT NULL DEFAULT '+33600000000',
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "FridgeItem" (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Autre',
      quantity DOUBLE PRECISION NOT NULL DEFAULT 1, unit TEXT NOT NULL DEFAULT 'pièce',
      "expirationDate" TIMESTAMPTZ NOT NULL,
      "addedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      emoji TEXT NOT NULL DEFAULT '📦', "usedInPlan" BOOLEAN NOT NULL DEFAULT FALSE,
      "userId" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "FridgeItem_userId_idx" ON "FridgeItem" ("userId");
    CREATE INDEX IF NOT EXISTS "FridgeItem_expirationDate_idx" ON "FridgeItem" ("expirationDate");
    CREATE TABLE IF NOT EXISTS "MealPlan" (
      id TEXT PRIMARY KEY, date TIMESTAMPTZ NOT NULL, "dayName" TEXT NOT NULL,
      "breakfastTitle" TEXT, "breakfastCal" INTEGER, "breakfastTime" TEXT,
      "lunchTitle" TEXT, "lunchCal" INTEGER, "lunchTime" TEXT,
      "dinnerTitle" TEXT, "dinnerCal" INTEGER, "dinnerTime" TEXT,
      "wasteSavedPercent" INTEGER NOT NULL DEFAULT 0,
      "fridgeItemIds" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "userId" TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "MealPlan_userId_date_key" ON "MealPlan" ("userId", date);
    CREATE TABLE IF NOT EXISTS "GroceryItem" (
      id TEXT PRIMARY KEY, item TEXT NOT NULL, qty TEXT NOT NULL,
      store TEXT NOT NULL DEFAULT 'Supermarché', checked BOOLEAN NOT NULL DEFAULT FALSE,
      "estimatedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "userId" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "GroceryItem_userId_idx" ON "GroceryItem" ("userId");
    -- idempotent column adds (in case tables exist from a previous schema without phone)
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '+33600000000';
    ALTER TABLE "FridgeItem" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_demo';
    ALTER TABLE "MealPlan"    ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_demo';
    ALTER TABLE "GroceryItem" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_demo';
  `;
  for (const stmt of SQL.split(";").map((s: string) => s.trim()).filter(Boolean)) {
    await pg.exec(stmt).catch(() => {});
  }
  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await pg.query(
    `INSERT INTO "User" (id, email, name, phone, "passwordHash") VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    ["user_demo", "demo@frigoai.app", "Chef Anti-Gaspi", "+33600000000", passwordHash]
  );
}

function createPrismaClientProd(): PrismaClient {
  return new PrismaClient({ log: ["error", "warn"] });
}

async function createPrismaClient(): Promise<PrismaClient> {
  if (isProdWithRealDb) {
    return createPrismaClientProd();
  }
  return createPrismaClientDev();
}

function getDbPromise(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return Promise.resolve(globalForPrisma.prisma);
  if (globalForPrisma.prismaPromise) return globalForPrisma.prismaPromise;
  globalForPrisma.prismaPromise = createPrismaClient().then((c) => {
    globalForPrisma.prisma = c;
    return c;
  });
  return globalForPrisma.prismaPromise;
}

export async function getDb(): Promise<PrismaClient> {
  return getDbPromise();
}

export async function initDb(): Promise<void> {
  await getDbPromise();
}
