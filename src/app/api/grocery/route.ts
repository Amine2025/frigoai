import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/grocery
export async function GET() {
  const [userId, err] = await requireUserId();
  if (err) return err;
  const db = await getDb();
  const items = await db.groceryItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ items });
}

// POST /api/grocery
export async function POST(req: NextRequest) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const body = await req.json();
    const { item, qty, store, estimatedPrice } = body || {};
    if (!item) {
      return NextResponse.json({ error: "item requis" }, { status: 400 });
    }
    const db = await getDb();
    const created = await db.groceryItem.create({
      data: {
        item: String(item).trim(),
        qty: String(qty || "1"),
        store: String(store || "Supermarché"),
        estimatedPrice: Number(estimatedPrice) || 0,
        userId,
      },
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/grocery]", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// DELETE all (regenerate) — scoped to current user
export async function DELETE() {
  const [userId, err] = await requireUserId();
  if (err) return err;
  const db = await getDb();
  await db.groceryItem.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
