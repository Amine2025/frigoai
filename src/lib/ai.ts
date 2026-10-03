// FrigoAi — AI meal-plan generation using z-ai-web-dev-sdk
import ZAI from "z-ai-web-dev-sdk";
import type { FridgeItem, MealDay } from "./types";
import { dayNameOf, FR_DAY_NAMES } from "./fridge-utils";
import { promises as fs } from "fs";
import path from "path";

/**
 * Ensure ZAI SDK can find its config file.
 * On Vercel, /etc/.z-ai-config doesn't exist — we create it from env vars
 * or from the project's .z-ai-config file.
 */
export async function ensureZaiConfig() {
  // Check if .z-ai-config exists in project root (works locally + if deployed)
  const projectConfig = path.join(process.cwd(), ".z-ai-config");
  try {
    await fs.access(projectConfig);
    return; // file exists, SDK will find it
  } catch {
    // not found — try to create from env vars
  }

  // On Vercel, create the config file from environment variables
  const baseUrl = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
  const apiKey = process.env.ZAI_API_KEY || "Z.ai";
  const token = process.env.ZAI_TOKEN;
  const chatId = process.env.ZAI_CHAT_ID;
  const userId = process.env.ZAI_USER_ID;

  if (token && chatId && userId) {
    const config = JSON.stringify({ baseUrl, apiKey, token, chatId, userId });
    try {
      await fs.writeFile(projectConfig, config, "utf-8");
    } catch {
      // can't write (read-only FS) — try /tmp
      try {
        await fs.writeFile("/tmp/.z-ai-config", config, "utf-8");
      } catch {
        /* ignore */
      }
    }
  }
}

interface RawPlan {
  breakfast: { title: string; cal: number; time: string };
  lunch: { title: string; cal: number; time: string };
  dinner: { title: string; cal: number; time: string };
  wasteSavedPercent: number;
}

const SYSTEM_PROMPT = `Tu es FrigoAi, un chef culinaire expert en anti-gaspillage alimentaire.
Ton rôle : concevoir un plan de repas de 7 jours qui ÉVITE TOUT GASPILLAGE en utilisant en priorité les produits du frigo les plus proches de la péremption.

RÈGLES STRICTES :
- Chaque jour contient : petit-déjeuner, déjeuner, dîner.
- Le DÉJEUNER doit toujours être composé à 100% de produits déjà présents dans le frigo (priorité absolue aux produits périmant le plus vite).
- Le petit-déjeuner et le dîner valorisent aussi les restes du frigo.
- Équilibre nutritionnel : ~500-700 kcal déjeuner, 300-450 kcal dîner, 250-400 kcal petit-déj.
- Titres courts et appétissants en français.
- time au format "08:00", "12:30", "19:30".
- wasteSavedPercent = pourcentage estimé de produits du frigo sauvés de la poubelle ce jour-là (0-100).

RÉPONSES UNIQUEMENT au format JSON valide, sans texte autour, sans markdown :
{
  "days": [
    { "breakfast": {"title": "...", "cal": 320, "time": "08:00"},
      "lunch":     {"title": "...", "cal": 620, "time": "12:30"},
      "dinner":    {"title": "...", "cal": 380, "time": "19:30"},
      "wasteSavedPercent": 92 },
    ... 7 entrées du lundi au dimanche
  ]
}`;

export async function generateMealPlanWithAI(
  fridgeItems: FridgeItem[],
  weekStartISO: string
): Promise<MealDay[]> {
  // Build a compact inventory list ordered by expiration (most urgent first)
  const sorted = [...fridgeItems].sort(
    (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );
  const inventory = sorted
    .map(
      (it) =>
        `- ${it.name} (${it.category}, ${it.quantity}${it.unit}, péremption: ${new Date(
          it.expirationDate
        ).toLocaleDateString("fr-FR")})`
    )
    .join("\n");

  const userPrompt = `Inventaire actuel du frigo (trié par péremption proche → lointaine) :\n${inventory}\n\nGénère le plan de repas des 7 jours de la semaine (Lundi → Dimanche) en JSON.`;

  try {
    await ensureZaiConfig();
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2400,
    });

    const text: string =
      completion?.choices?.[0]?.message?.content ??
      completion?.message?.content ??
      "";

    // Extract JSON object from possibly wrapped response
    const jsonStr = extractJson(text);
    if (!jsonStr) throw new Error("No JSON in AI response");

    const parsed = JSON.parse(jsonStr);
    const days: RawPlan[] = parsed.days ?? parsed;

    if (!Array.isArray(days) || days.length < 7) {
      throw new Error("AI returned fewer than 7 days");
    }

    const result: MealDay[] = days.slice(0, 7).map((raw, idx) => {
      const dateISO = new Date(weekStartISO);
      dateISO.setDate(dateISO.getDate() + idx);
      const dayName = dayNameOf(dateISO.toISOString());
      const dateStr = dateISO.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
      const isToday =
        dateISO.toDateString() === new Date().toDateString();
      return {
        date: dateISO.toISOString(),
        dayName,
        dateStr: isToday ? `Aujourd'hui · ${dateStr}` : dateStr,
        breakfast: {
          title: raw.breakfast?.title ?? "Petit-déjeuner équilibré",
          cal: Number(raw.breakfast?.cal ?? 320),
          time: raw.breakfast?.time ?? "08:00",
        },
        lunch: {
          title: raw.lunch?.title ?? "Déjeuner frigo",
          cal: Number(raw.lunch?.cal ?? 620),
          time: raw.lunch?.time ?? "12:30",
        },
        dinner: {
          title: raw.dinner?.title ?? "Dîner léger",
          cal: Number(raw.dinner?.cal ?? 380),
          time: raw.dinner?.time ?? "19:30",
        },
        totalWasteSavedPercent: Math.min(
          100,
          Math.max(0, Number(raw.wasteSavedPercent ?? 85))
        ),
      };
    });

    return result;
  } catch (err) {
    console.error("[FrigoAi] AI meal plan generation failed:", err);
    // Fallback to deterministic plan if AI fails
    return fallbackPlan(fridgeItems, weekStartISO);
  }
}

function extractJson(text: string): string | null {
  // Try direct JSON object
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
}

// Deterministic fallback when AI is unavailable — still anti-waste-aware
function fallbackPlan(items: FridgeItem[], weekStartISO: string): MealDay[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );
  // Pool of recipes referencing real products in the fridge
  const topNames = sorted.slice(0, 8).map((i) => i.name);

  const lunches = [
    `Velouté de ${topNames[0] ?? "légumes"} & croutons`,
    `${topNames[1] ?? "Poulet"} rôti aux ${topNames[2] ?? "légumes"} du frigo`,
    `Pâtes du jour aux ${topNames[3] ?? "restes"} valorisés`,
    `Salade composée ${topNames[4] ?? "légumes"} & œuf`,
    `${topNames[5] ?? "Poisson"} en papillote, légumes anti-gaspi`,
    `Bowl ${topNames[6] ?? "féculents"} & ${topNames[0] ?? "crudités"}`,
    `Frittata aux ${topNames[7] ?? "restes"} du frigo`,
  ];
  const breakfasts = [
    "Yaourt, granola & fruit frais",
    "Tartines beurre & confiture, thé",
    "Œufs brouillés & pain grillé",
    "Smoothie anti-gaspi aux fruits",
    "Bowl avoine, banane & graines",
    "Pain perdu aux fruits",
    "Café, tartines & compote",
  ];
  const dinners = [
    "Soupe légère & tartines",
    "Salade verte & fromage",
    "Omelette aux fines herbes",
    "Légumes grillés & houmous",
    "Bouillon miso & tofu",
    "Wrap restes & crudités",
    "Soupe de légumes du frigo",
  ];
  const cal = (base: number, i: number) => base + ((i * 37) % 90);

  return FR_DAY_NAMES.map((dayName, idx) => {
    const dateISO = new Date(weekStartISO);
    dateISO.setDate(dateISO.getDate() + idx);
    const isToday = dateISO.toDateString() === new Date().toDateString();
    return {
      date: dateISO.toISOString(),
      dayName,
      dateStr: isToday
        ? `Aujourd'hui · ${dateISO.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
        : dateISO.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      breakfast: { title: breakfasts[idx % 7], cal: cal(300, idx), time: "08:00" },
      lunch: { title: lunches[idx % 7], cal: cal(560, idx), time: "12:30" },
      dinner: { title: dinners[idx % 7], cal: cal(340, idx), time: "19:30" },
      totalWasteSavedPercent: 80 + ((idx * 7) % 18),
    };
  });
}
