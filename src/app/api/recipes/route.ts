import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type {
  Recipe,
  RecipeDifficulty,
  RecipeIngredient,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es ChefGaspi, un chef cuisinier expert en cuisine anti-gaspillage créative.
On te donne la liste des produits restants dans le frigo d'un utilisateur, triés par péremption proche.
Ta mission : proposer des recettes RÉALISTES et APPÉTISSANTES qui utilisent en PRIORITÉ les produits bientôt périmés.

RÈGLES :
- Génère exactement 3 recettes variées (ne pas faire 3 soupes identiques).
- Réponds en FRANÇAIS UNIQUEMENT, sans markdown, sans commentaires autour du JSON.
- Chaque recette doit utiliser AU MOINS UN produit résiduel du frigo (idéalement les plus urgents).
- Sois créatif : veloutés, poêlées, frittatas, bowls, gratins, salades composées, smoothies, pancakes salés, etc.
- Ingrédients : marque fromFridge=true si le produit est dans le frigo, false s'il manque (fond de placard).
- Quantités concrètes en français ("2 tranches", "200g", "1 oignon").
- Étapes claires et concises (3-6 étapes max), impératives.
- temps en MINUTES (prepTimeMin = préparation, cookTimeMin = cuisson; 0 si pas de cuisson).
- difficulty parmi : "Facile", "Moyen", "Difficile".
- mealType parmi : "Petit-déjeuner", "Déjeuner", "Dîner", "Goûter", "Apéritif".
- tags : 2-4 tags pertinents parmi "Végétarien", "Vegan", "Anti-gaspi", "Express" (≤20min total), "Sans gluten", "Riche en protéines", "Familial", "Économique".
- wasteSavedPercent : % estimé des produits résiduels utilisés par cette recette (0-100).
- emoji : UN emoji représentatif du plat.
- calories : total du plat par personne.

RÉPONSE : UNIQUEMENT du JSON valide, sans markdown :
{"recipes":[{
  "title":"Velouté anti-gaspi tomates & basilic",
  "emoji":"🍲","mealType":"Dîner",
  "description":"Une_oneline_appétissante_de_30_mots_max",
  "prepTimeMin":10,"cookTimeMin":20,
  "difficulty":"Facile","servings":2,"calories":280,
  "tags":["Végétarien","Anti-gaspi","Express"],
  "wasteSavedPercent":85,
  "ingredients":[
    {"name":"Tomates","qty":"4 pièces","fromFridge":true},
    {"name":"Oignon","qty":"1 pièce","fromFridge":true},
    {"name":"Basilic","qty":"10 feuilles","fromFridge":true},
    {"name":"Crème fraîche","qty":"2 c.à.s","fromFridge":false}
  ],
  "steps":["Étape 1...","Étape 2...","Étape 3..."]
}]}`;

function repairJson(str: string): string {
  // Count unbalanced braces/brackets and close them (best-effort repair for truncated LLM output)
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") braces++;
    else if (c === "}") braces--;
    else if (c === "[") brackets++;
    else if (c === "]") brackets--;
  }
  let repaired = str;
  // If we're mid-string, close it
  if (inString) repaired += '"';
  // Close brackets first, then braces
  for (let i = 0; i < Math.max(0, brackets); i++) repaired += "]";
  for (let i = 0; i < Math.max(0, braces); i++) repaired += "}";
  return repaired;
}

function extractJson(text: string): string | null {
  // Strip markdown code fences if present (```json ... ```)
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  // Maybe truncated without closing brace — take from first { to end and repair
  if (start >= 0) {
    const partial = t.slice(start);
    return repairJson(partial);
  }
  return null;
}

function safeDifficulty(d: unknown): RecipeDifficulty {
  if (d === "Facile" || d === "Moyen" || d === "Difficile") return d;
  return "Facile";
}

function safeMealType(m: unknown): Recipe["mealType"] {
  const valid = [
    "Petit-déjeuner",
    "Déjeuner",
    "Dîner",
    "Goûter",
    "Apéritif",
  ] as const;
  if (typeof m === "string" && (valid as readonly string[]).includes(m)) {
    return m as Recipe["mealType"];
  }
  return "Déjeuner";
}

// POST /api/recipes — body: { items: [{name, quantity, unit, category, expirationDate, daysLeft}] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Votre frigo est vide. Ajoutez des produits pour générer des recettes." },
        { status: 400 }
      );
    }

    // Build a compact inventory sorted by urgency (most urgent first)
    const sorted = [...items].sort(
      (a: any, b: any) => Number(a.daysLeft ?? 0) - Number(b.daysLeft ?? 0)
    );
    const inventory = sorted
      .map((it: any) => {
        const dl = Number(it.daysLeft ?? 0);
        const urgency =
          dl < 0 ? "PÉRIMÉ" : dl <= 2 ? "URGENT" : dl <= 5 ? "bientôt" : "frais";
        return `- ${it.name} (${it.category || "?"}, ${it.quantity || 1} ${
          it.unit || ""
        }, ${urgency}, ${dl}j)`;
      })
      .join("\n");

    const userPrompt = `Voici l'inventaire du frigo (trié urgence → frais) :\n${inventory}\n\nPropose 3 recettes anti-gaspi variées en JSON pur (sans markdown, sans \`\`\`json).`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const text: string =
      completion?.choices?.[0]?.message?.content ??
      completion?.message?.content ??
      "";

    const jsonStr = extractJson(text);
    if (!jsonStr) {
      return NextResponse.json(
        { error: "Réponse IA illisible", raw: text.slice(0, 400) },
        { status: 502 }
      );
    }

    let parsed: { recipes?: unknown };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "JSON invalide depuis l'IA", raw: text.slice(0, 400) },
        { status: 502 }
      );
    }

    const rawRecipes = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const recipes: Recipe[] = rawRecipes
      .map((raw: any, idx: number): Recipe | null => {
        if (!raw || typeof raw.title !== "string") return null;
        const steps = Array.isArray(raw.steps)
          ? raw.steps.filter((s: any) => typeof s === "string" && s.trim()).map(String)
          : [];
        if (steps.length === 0) return null;
        const ingredients: RecipeIngredient[] = Array.isArray(raw.ingredients)
          ? raw.ingredients
              .map((ing: any): RecipeIngredient | null => {
                if (!ing || typeof ing.name !== "string") return null;
                return {
                  name: String(ing.name).trim(),
                  qty: typeof ing.qty === "string" && ing.qty ? ing.qty : "—",
                  fromFridge: Boolean(ing.fromFridge),
                };
              })
              .filter((x): x is RecipeIngredient => x !== null)
          : [];
        if (ingredients.length === 0) return null;
        return {
          id: `recipe-${Date.now()}-${idx}`,
          title: String(raw.title).trim(),
          emoji:
            typeof raw.emoji === "string" && raw.emoji ? raw.emoji : "🍽️",
          mealType: safeMealType(raw.mealType),
          description:
            typeof raw.description === "string"
              ? raw.description.replace(/_/g, " ").slice(0, 200)
              : "",
          prepTimeMin: Math.max(0, Math.min(180, Number(raw.prepTimeMin) || 0)),
          cookTimeMin: Math.max(0, Math.min(300, Number(raw.cookTimeMin) || 0)),
          difficulty: safeDifficulty(raw.difficulty),
          servings: Math.max(1, Math.min(12, Number(raw.servings) || 2)),
          calories: Math.max(0, Math.min(2000, Number(raw.calories) || 0)),
          tags: Array.isArray(raw.tags)
            ? raw.tags.filter((t: any) => typeof t === "string").map(String).slice(0, 5)
            : [],
          wasteSavedPercent: Math.max(
            0,
            Math.min(100, Number(raw.wasteSavedPercent) || 50)
          ),
          ingredients,
          steps,
        };
      })
      .filter((x): x is Recipe => x !== null);

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: "Aucune recette générée par l'IA." },
        { status: 502 }
      );
    }

    return NextResponse.json({ recipes });
  } catch (err) {
    console.error("[POST /api/recipes]", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération des recettes" },
      { status: 500 }
    );
  }
}
