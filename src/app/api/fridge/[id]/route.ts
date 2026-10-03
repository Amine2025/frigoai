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

// PATCH /api/fridge/[id] — update item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.quantity !== undefined) data.quantity = Number(body.quantity) || 1;
    if (body.unit !== undefined) data.unit = String(body.unit);
    if (body.expirationDate !== undefined)
      data.expirationDate = new Date(body.expirationDate);
    if (body.usedInPlan !== undefined) data.usedInPlan = Boolean(body.usedInPlan);
    if (body.category !== undefined) {
      data.category = VALID_CATEGORIES.includes(body.category)
        ? body.category
        : "Autre";
      data.emoji = body.emoji ?? emojiFor(String(body.name ?? ""), String(data.category));
    }

    const db = await getDb();
    // scope by userId to prevent cross-user edits
    const item = await db.fridgeItem.update({
      where: { id, userId },
      data,
    });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[PATCH /api/fridge/:id]", err);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

// DELETE /api/fridge/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const { id } = await params;
    const db = await getDb();
    await db.fridgeItem.delete({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/fridge/:id]", err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
