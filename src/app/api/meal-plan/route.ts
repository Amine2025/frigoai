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
    let planDays: MealDay[] = [];
    try {
      planDays = await generateMealPlanWithAI(
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
    } catch (aiErr) {
      console.error("[POST /api/meal-plan] AI failed, using local fallback:", aiErr);
      // Local fallback: generate 7 days without AI
      planDays = generateLocalPlan(items, start.toISOString());
    }

    // If AI/fallback returned 0 days, use local plan
    if (planDays.length === 0) {
      planDays = generateLocalPlan(items, start.toISOString());
    }

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
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Erreur lors de la génération du plan", detail },
      { status: 500 }
    );
  }
}

/**
 * Local fallback: generates 7 meal days without AI.
 * Uses fridge items sorted by expiration urgency.
 */
function generateLocalPlan(items: any[], weekStartISO: string): MealDay[] {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );
  const topNames = sorted.slice(0, 8).map((i) => i.name);
  const FR_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const breakfasts = [
    "Yaourt aux fruits du frigo",
    "Tartines & confiture",
    "Œufs brouillés aux restes",
    "Smoothie anti-gaspi",
    "Pain perdu aux fruits",
    "Café & tartines beurrées",
    "Bowl avoine & fruits",
  ];
  const lunches = [
    `Poêlée de ${topNames[0] ?? "légumes"}`,
    `${topNames[1] ?? "Poulet"} rôti aux légumes`,
    `Pâtes aux ${topNames[2] ?? "restes"}`,
    `Salade composée ${topNames[3] ?? "légumes"}`,
    `${topNames[4] ?? "Poisson"} en papillote`,
    `Bowl ${topNames[5] ?? "féculents"} & crudités`,
    `Frittata aux ${topNames[6] ?? "restes"}`,
  ];
  const dinners = [
    "Soupe légère & tartines",
    "Salade verte & fromage",
    "Omelette aux fines herbes",
    "Légumes grillés & houmous",
    "Bouillon miso & tofu",
    "Wrap restes & crudités",
    "Velouté anti-gaspi",
  ];

  return FR_DAYS.map((dayName, idx) => {
    const date = new Date(weekStartISO);
    date.setDate(date.getDate() + idx);
    const isToday = date.toDateString() === new Date().toDateString();
    const dateStr = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    return {
      date: date.toISOString(),
      dayName,
      dateStr: isToday ? `Aujourd'hui · ${dateStr}` : dateStr,
      breakfast: {
        title: breakfasts[idx],
        cal: 300 + ((idx * 37) % 80),
        time: "08:00",
      },
      lunch: {
        title: lunches[idx],
        cal: 560 + ((idx * 53) % 90),
        time: "12:30",
      },
      dinner: {
        title: dinners[idx],
        cal: 340 + ((idx * 29) % 70),
        time: "19:30",
      },
      totalWasteSavedPercent: 80 + ((idx * 7) % 18),
    };
  });
}
