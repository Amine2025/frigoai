import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { generateMealPlanWithAI } from "@/lib/ai";
import { dayNameOf } from "@/lib/fridge-utils";
import type { MealDay } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/meal-plan?weekStart=ISO — return stored plan for the week (or empty)
export async function GET(req: NextRequest) {
  const [userId, err] = await requireUserId();
  if (err) return err;

  const url = new URL(req.url);
  const weekStart = url.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json(
      { error: "weekStart requis" },
      { status: 400 }
    );
  }
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const db = await getDb();
  const stored = await db.mealPlan.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  const days: MealDay[] = stored.map((p) => {
    const isToday = p.date.toDateString() === new Date().toDateString();
    const dateStr = p.date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    return {
      date: p.date.toISOString(),
      dayName: p.dayName,
      dateStr: isToday ? `Aujourd'hui · ${dateStr}` : dateStr,
      breakfast: {
        title: p.breakfastTitle,
        cal: p.breakfastCal,
        time: p.breakfastTime,
      },
      lunch: { title: p.lunchTitle, cal: p.lunchCal, time: p.lunchTime },
      dinner: { title: p.dinnerTitle, cal: p.dinnerCal, time: p.dinnerTime },
      totalWasteSavedPercent: p.wasteSavedPercent,
    };
  });

  return NextResponse.json({ days });
}

// POST /api/meal-plan — generate (AI) & store a 7-day plan for the current user
export async function POST(req: NextRequest) {
  try {
    const [userId, err] = await requireUserId();
    if (err) return err;

    const body = await req.json().catch(() => ({}));
    let weekStartISO: string | null = body?.weekStart ?? null;

    if (!weekStartISO) {
      // start of current week (Monday)
      const now = new Date();
      const day = (now.getDay() + 6) % 7; // 0 = Monday
      const monday = new Date(now);
      monday.setDate(now.getDate() - day);
      monday.setHours(0, 0, 0, 0);
      weekStartISO = monday.toISOString();
    }

    const start = new Date(weekStartISO);
    start.setHours(0, 0, 0, 0);

    const db = await getDb();

    // Pull current user's fridge inventory
    const items = await db.fridgeItem.findMany({
      where: { userId },
      orderBy: { expirationDate: "asc" },
    });

    // Generate via AI (falls back to deterministic if AI fails)
    const planDays: MealDay[] = await generateMealPlanWithAI(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category as MealDay["dayName"] extends never ? never : any,
        quantity: i.quantity,
        unit: i.unit,
        expirationDate: i.expirationDate.toISOString(),
        addedAt: i.addedAt.toISOString(),
        emoji: i.emoji,
        usedInPlan: i.usedInPlan,
      })),
      start.toISOString()
    );

    // Wipe previous plan in this week window for this user, then store new
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    await db.mealPlan.deleteMany({
      where: { userId, date: { gte: start, lt: end } },
    });

    const created = await Promise.all(
      planDays.map(async (d) => {
        const date = new Date(d.date);
        date.setHours(0, 0, 0, 0);
        const dayName = dayNameOf(date.toISOString());
        return db.mealPlan.create({
          data: {
            date,
            dayName,
            breakfastTitle: d.breakfast.title,
            breakfastCal: d.breakfast.cal,
            breakfastTime: d.breakfast.time,
            lunchTitle: d.lunch.title,
            lunchCal: d.lunch.cal,
            lunchTime: d.lunch.time,
            dinnerTitle: d.dinner.title,
            dinnerCal: d.dinner.cal,
            dinnerTime: d.dinner.time,
            wasteSavedPercent: d.totalWasteSavedPercent,
            userId,
          },
        });
      })
    );

    // Mark top urgent fridge items as used in plan
    const urgentIds = items.slice(0, Math.min(10, items.length)).map((i) => i.id);
    if (urgentIds.length) {
      await db.fridgeItem.updateMany({
        where: { id: { in: urgentIds }, userId },
        data: { usedInPlan: true },
      });
    }

    // Also derive grocery list (items missing for the plan) — scoped to user
    await db.groceryItem.deleteMany({ where: { userId } });
    const grocerySeeds = [
      { item: "Riz basmati 1kg", qty: "1 paquet", store: "Supermarché", estimatedPrice: 2.1 },
      { item: "Pâtes complètes 500g", qty: "1 paquet", store: "Supermarché", estimatedPrice: 1.4 },
      { item: "Huile d'olive 50cl", qty: "1 bouteille", store: "Épicerie", estimatedPrice: 4.9 },
      { item: "Œufs (boîte de 6)", qty: "6 pièces", store: "Marché", estimatedPrice: 2.6 },
      { item: "Épices assorties", qty: "1 lot", store: "Épicerie", estimatedPrice: 3.5 },
    ];
    await db.groceryItem.createMany({
      data: grocerySeeds.map((g) => ({ ...g, userId })),
    });

    return NextResponse.json({ days: planDays, count: created.length });
  } catch (err) {
    console.error("[POST /api/meal-plan]", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération du plan" },
      { status: 500 }
    );
  }
}
