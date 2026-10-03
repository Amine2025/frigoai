import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/grocery/[id] — toggle checked / update
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
    if (body.checked !== undefined) data.checked = Boolean(body.checked);
    if (body.item !== undefined) data.item = String(body.item);
    if (body.qty !== undefined) data.qty = String(body.qty);
    if (body.store !== undefined) data.store = String(body.store);
    if (body.estimatedPrice !== undefined)
      data.estimatedPrice = Number(body.estimatedPrice);

    const db = await getDb();
    const item = await db.groceryItem.update({
      where: { id, userId },
      data,
    });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[PATCH /api/grocery/:id]", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// DELETE /api/grocery/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const { id } = await params;
    const db = await getDb();
    await db.groceryItem.delete({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/grocery/:id]", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
