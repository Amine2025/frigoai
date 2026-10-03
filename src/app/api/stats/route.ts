import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { daysUntil } from "@/lib/fridge-utils";
import type { DashboardStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/stats — dashboard stats (scoped to current user)
export async function GET() {
  const [userId, err] = await requireUserId();
  if (err) return err;
  const db = await getDb();
  const items = await db.fridgeItem.findMany({ where: { userId } });
  const mealPlans = await db.mealPlan.findMany({
    where: {
      userId,
      date: { gte: new Date(Date.now() - 7 * 86400000) },
    },
  });

  let expiringSoon = 0;
  let expired = 0;
  for (const it of items) {
    const d = daysUntil(it.expirationDate.toISOString());
    if (d < 0) expired += 1;
    else if (d <= 3) expiringSoon += 1;
  }

  const totalCaloriesPlanned = mealPlans.reduce(
    (acc, p) => acc + p.breakfastCal + p.lunchCal + p.dinnerCal,
    0
  );
  const wasteSavedPercent =
    mealPlans.length > 0
      ? Math.round(
          mealPlans.reduce((acc, p) => acc + p.wasteSavedPercent, 0) /
            mealPlans.length
        )
      : 0;

  // estimated € saved = ~2.5€ per anti-waste meal
  const estimatedSavings = Math.round(mealPlans.length * 3 * 2.5);

  const stats: DashboardStats = {
    totalItems: items.length,
    expiringSoon,
    expired,
    totalCaloriesPlanned,
    wasteSavedPercent,
    estimatedSavings,
  };

  return NextResponse.json({ stats });
}
