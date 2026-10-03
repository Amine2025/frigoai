import { PGlite } from "@electric-sql/pglite";
import { rm } from "node:fs/promises";
import bcrypt from "bcryptjs";

const DATA_DIR = "./db/frigoai-pgdata";

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

const SEED_ITEMS = [
  { name: "Tomates", category: "Légumes", quantity: 4, unit: "pièces", days: 2, emoji: "🍅" },
  { name: "Poulet", category: "Viandes & Poissons", quantity: 2, unit: "tranches", days: 1, emoji: "🍗" },
  { name: "Yaourt nature", category: "Produits laitiers", quantity: 4, unit: "pots", days: 3, emoji: "🥛" },
  { name: "Lait demi-écrémé", category: "Produits laitiers", quantity: 1, unit: "L", days: 5, emoji: "🥛" },
  { name: "Œufs", category: "Produits laitiers", quantity: 6, unit: "pièces", days: 10, emoji: "🥚" },
  { name: "Carottes", category: "Légumes", quantity: 5, unit: "pièces", days: 7, emoji: "🥕" },
  { name: "Pomme de terre", category: "Féculents", quantity: 1, unit: "kg", days: 14, emoji: "🥔" },
  { name: "Bananes", category: "Fruits", quantity: 3, unit: "pièces", days: 2, emoji: "🍌" },
  { name: "Pain de mie", category: "Féculents", quantity: 1, unit: "paquet", days: 4, emoji: "🍞" },
  { name: "Brocoli", category: "Légumes", quantity: 1, unit: "pièce", days: 3, emoji: "🥦" },
  { name: "Saumon frais", category: "Viandes & Poissons", quantity: 2, unit: "pavés", days: 1, emoji: "🐟" },
  { name: "Fromage râpé", category: "Produits laitiers", quantity: 200, unit: "g", days: 8, emoji: "🧀" },
  { name: "Pâtes penne", category: "Féculents", quantity: 500, unit: "g", days: 120, emoji: "🍝" },
  { name: "Riz basmati", category: "Féculents", quantity: 1, unit: "kg", days: 200, emoji: "🍚" },
  { name: "Fraises", category: "Fruits", quantity: 250, unit: "g", days: 2, emoji: "🍓" },
  { name: "Courgette", category: "Légumes", quantity: 2, unit: "pièces", days: 5, emoji: "🥒" },
];

const DEMO_USER = {
  id: "user_demo",
  email: "demo@frigoai.app",
  name: "Chef Anti-Gaspi",
  phone: "+33600000000",
  password: "demo1234",
};

async function main() {
  if (process.argv[2] === "--reset") {
    await rm(DATA_DIR, { recursive: true, force: true }).catch(() => {});
  }
  const pg = new PGlite({ dataDir: DATA_DIR, options: { fsync: false } });
  await pg.waitReady?.catch(() => {});
  for (const stmt of SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await pg.exec(stmt);
  }
  console.log("✓ Tables créées (User avec phone)");

  // Create demo user with phone
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  await pg.query(
    `INSERT INTO "User" (id, email, name, phone, "passwordHash") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone, "passwordHash" = EXCLUDED."passwordHash"`,
    [DEMO_USER.id, DEMO_USER.email, DEMO_USER.name, DEMO_USER.phone, passwordHash]
  );
  console.log(
    `✓ User démo créé : ${DEMO_USER.email} / ${DEMO_USER.password} (phone: ${DEMO_USER.phone})`
  );

  // Seed demo items
  const count = await pg.query(
    `SELECT COUNT(*)::TEXT AS count FROM "FridgeItem" WHERE "userId" = $1`,
    [DEMO_USER.id]
  );
  if (Number(count.rows[0].count) === 0) {
    const now = Date.now();
    const day = 86400000;
    for (const s of SEED_ITEMS) {
      const id = `seed_${Math.random().toString(36).slice(2, 12)}`;
      const exp = new Date(now + s.days * day).toISOString();
      await pg.query(
        `INSERT INTO "FridgeItem" (id, name, category, quantity, unit, "expirationDate", emoji, "usedInPlan", "userId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8)`,
        [id, s.name, s.category, s.quantity, s.unit, exp, s.emoji, DEMO_USER.id]
      );
    }
    console.log(`✓ ${SEED_ITEMS.length} produits démo seedés (avec bons emojis)`);
  } else {
    console.log(`→ Fridge déjà rempli (${count.rows[0].count} items)`);
  }

  await pg.close();
  console.log("✓ Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
