import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { emojiFor } from "@/lib/fridge-utils";
import type { FridgeCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: FridgeCategory[] = [
  "Fruits",
  "Légumes",
  "Produits laitiers",
  "Viandes & Poissons",
  "Féculents",
  "Surgelés",
  "Boissons",
  "Autre",
];

// GET /api/fridge — list items sorted by expiration (soonest first)
export async function GET() {
  const [userId, err] = await requireUserId();
  if (err) return err;
  const db = await getDb();
  const items = await db.fridgeItem.findMany({
    where: { userId },
    orderBy: { expirationDate: "asc" },
  });
  return NextResponse.json({ items });
}

// POST /api/fridge — add a new item
export async function POST(req: NextRequest) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const body = await req.json();
    const {
      name,
      category = "Autre",
      quantity = 1,
      unit = "pièce",
      expirationDate,
      emoji,
    } = body || {};

    if (!name || !expirationDate) {
      return NextResponse.json(
        { error: "name et expirationDate sont requis" },
        { status: 400 }
      );
    }

    const safeCategory = (VALID_CATEGORIES.includes(category)
      ? category
      : "Autre") as FridgeCategory;

    const db = await getDb();
    const item = await db.fridgeItem.create({
      data: {
        name: String(name).trim(),
        category: safeCategory,
        quantity: Number(quantity) || 1,
        unit: String(unit || "pièce"),
        expirationDate: new Date(expirationDate),
        emoji: emoji ? String(emoji) : emojiFor(name, safeCategory),
        userId,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/fridge]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du produit" },
      { status: 500 }
    );
  }
}

// DELETE all (used by seed)
export async function DELETE() {
  const [userId, err] = await requireUserId();
  if (err) return err;
  const db = await getDb();
  await db.fridgeItem.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
