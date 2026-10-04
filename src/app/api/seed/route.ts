import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { emojiFor } from "@/lib/fridge-utils";

export const dynamic = "force-dynamic";

// POST /api/seed — seed demo fridge items for the current user (idempotent: clears first)
export async function POST(req: NextRequest) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const body = await req.json().catch(() => ({}));
    const force = body?.force !== false;

    const db = await getDb();

    const count = await db.fridgeItem.count({ where: { userId } });
    if (count > 0 && !force) {
      return NextResponse.json({ ok: true, seeded: 0, message: "already seeded" });
    }

    // wipe this user's data only
    await db.fridgeItem.deleteMany({ where: { userId } });
    await db.mealPlan.deleteMany({ where: { userId } });
    await db.groceryItem.deleteMany({ where: { userId } });

    const now = Date.now();
    const day = 86400000;

    // demo inventory — realistic mix, some urgent, some fresh
    const seeds = [
      { name: "Tomates", category: "Légumes", quantity: 4, unit: "pièces", days: 2 },
      { name: "Poulet", category: "Viandes & Poissons", quantity: 2, unit: "tranches", days: 1 },
      { name: "Yaourt nature", category: "Produits laitiers", quantity: 4, unit: "pots", days: 3 },
      { name: "Lait demi-écrémé", category: "Produits laitiers", quantity: 1, unit: "L", days: 5 },
      { name: "Œufs", category: "Produits laitiers", quantity: 6, unit: "pièces", days: 10 },
      { name: "Carottes", category: "Légumes", quantity: 5, unit: "pièces", days: 7 },
      { name: "Pomme de terre", category: "Féculents", quantity: 1, unit: "kg", days: 14 },
      { name: "Bananes", category: "Fruits", quantity: 3, unit: "pièces", days: 2 },
      { name: "Pain de mie", category: "Féculents", quantity: 1, unit: "paquet", days: 4 },
      { name: "Brocoli", category: "Légumes", quantity: 1, unit: "pièce", days: 3 },
      { name: "Saumon frais", category: "Viandes & Poissons", quantity: 2, unit: "pavés", days: 1 },
      { name: "Fromage râpé", category: "Produits laitiers", quantity: 200, unit: "g", days: 8 },
      { name: "Pâtes penne", category: "Féculents", quantity: 500, unit: "g", days: 120 },
      { name: "Riz basmati", category: "Féculents", quantity: 1, unit: "kg", days: 200 },
      { name: "Fraises", category: "Fruits", quantity: 250, unit: "g", days: 2 },
      { name: "Courgette", category: "Légumes", quantity: 2, unit: "pièces", days: 5 },
    ];

    const created = await Promise.all(
      seeds.map((s) =>
        db.fridgeItem.create({
          data: {
            name: s.name,
            category: s.category,
            quantity: s.quantity,
            unit: s.unit,
            expirationDate: new Date(now + s.days * day),
            emoji: emojiFor(s.name, s.category),
            userId,
          },
        })
      )
    );

    return NextResponse.json({ ok: true, seeded: created.length });
  } catch (err) {
    console.error("[POST /api/seed]", err);
    return NextResponse.json({ error: "Erreur de seed" }, { status: 500 });
  }
}
