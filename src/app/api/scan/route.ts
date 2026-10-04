import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { FridgeCategory, ScannedItem } from "@/lib/types";

export const dynamic = "force-dynamic";
// Allow larger payloads (base64 images can be ~1-2MB)
export const maxDuration = 60;

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

const SYSTEM_PROMPT = `Tu es FrigoScan, un expert en reconnaissance d'aliments par vision.
On te montre une photo de produits alimentaires (frigo, étalage, panier de courses, plan de travail).
Ta tâche : identifier TOUS les produits alimentaires visibles et renvoyer une liste structurée au format JSON.

RÈGLES :
- Identifie chaque produit distinct visible sur la photo.
- Pour chacun : nom court en français (singulier si possible), catégorie parmi les 8 valeurs exactes :
  "Fruits", "Légumes", "Produits laitiers", "Viandes & Poissons", "Féculents", "Surgelés", "Boissons", "Autre"
- Quantité estimée (nombre) + unité ("pièce", "g", "kg", "L", "ml", "boîte", "tranche", "paquet", "pot").
- estimatedExpirationDays : nombre de jours avant péremption (produit frais réel). Exemples : lait 5, yaourt 7, tomate 4, poulet cru 2, pain 3, œuf 14, banane 3, saumon frais 2, fromage 10, carotte 10.
- emoji : UN emoji représentatif.
- confidence : 0 à 1 (ta certitude de l'identification).
- Ne dédouble pas le même produit. Si plusieurs unités identiques, regroupe (quantity = total).
- Si tu ne reconnais rien (image floue, non-alimentaire), renvoie {"items": []}.

RÉPONSE : UNIQUEMENT du JSON valide, sans markdown, sans texte autour :
{"items":[{"name":"Tomate","category":"Légumes","quantity":3,"unit":"pièce","estimatedExpirationDays":4,"emoji":"🍅","confidence":0.95}]}`;

function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

function safeCategory(cat: unknown): FridgeCategory {
  if (typeof cat === "string" && VALID_CATEGORIES.includes(cat as FridgeCategory)) {
    return cat as FridgeCategory;
  }
  return "Autre";
}

// POST /api/scan — body: { image: "data:image/jpeg;base64,..." }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body?.image;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image manquante (data URL base64 attendu)" },
        { status: 400 }
      );
    }

    // Basic validation: must look like a data URL or http URL
    if (!image.startsWith("data:image/") && !image.startsWith("http")) {
      return NextResponse.json(
        { error: "Format d'image invalide (data:image/...;base64,...)" },
        { status: 400 }
      );
    }

    // Cap payload size to ~5MB
    if (image.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image trop volumineuse (>5MB)" },
        { status: 413 }
      );
    }

    const zai = await ZAI.create();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    const text: string =
      response?.choices?.[0]?.message?.content ??
      response?.message?.content ??
      "";

    const jsonStr = extractJson(text);
    if (!jsonStr) {
      return NextResponse.json(
        { error: "Réponse IA illisible", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    let parsed: { items?: unknown };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "JSON invalide depuis l'IA", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items: ScannedItem[] = rawItems
      .map((raw: any): ScannedItem | null => {
        if (!raw || typeof raw.name !== "string") return null;
        const name = String(raw.name).trim();
        if (!name) return null;
        return {
          name,
          category: safeCategory(raw.category),
          quantity: Math.max(1, Number(raw.quantity) || 1),
          unit: typeof raw.unit === "string" && raw.unit ? raw.unit : "pièce",
          estimatedExpirationDays: Math.max(
            1,
            Math.min(365, Number(raw.estimatedExpirationDays) || 5)
          ),
          emoji:
            typeof raw.emoji === "string" && raw.emoji
              ? raw.emoji
              : "📦",
          confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
        };
      })
      .filter((x): x is ScannedItem => x !== null);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[POST /api/scan]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse de l'image" },
      { status: 500 }
    );
  }
}
