// FrigoAi fridge utilities (expiration, days left, freshness level)

export interface Freshness {
  level: "expired" | "urgent" | "soon" | "ok" | "fresh";
  daysLeft: number;
  label: string;
  color: string; // hex
  glow?: boolean;
}

export function daysUntil(dateISO: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateISO);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function freshness(dateISO: string): Freshness {
  const d = daysUntil(dateISO);
  if (d < 0)
    return { level: "expired", daysLeft: d, label: "Périmé", color: "#ef4444", glow: true };
  if (d === 0)
    return { level: "urgent", daysLeft: 0, label: "Aujourd'hui", color: "#f97316", glow: true };
  if (d === 1)
    return { level: "urgent", daysLeft: 1, label: "Demain", color: "#f97316", glow: true };
  if (d <= 3)
    return { level: "soon", daysLeft: d, label: `${d} jours`, color: "#eab308" };
  if (d <= 7)
    return { level: "ok", daysLeft: d, label: `${d} jours`, color: "#22c55e" };
  return { level: "fresh", daysLeft: d, label: `${d} jours`, color: "#06b6d4" };
}

export function relativeDate(dateISO: string): string {
  const d = daysUntil(dateISO);
  if (d < 0) return `Périmé ${Math.abs(d)}j`;
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  if (d < 7) return `Dans ${d}j`;
  return new Date(dateISO).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export const CATEGORY_META: Record<
  string,
  { emoji: string; color: string; label: string }
> = {
  Fruits: { emoji: "🍎", color: "#ef4444", label: "Fruits" },
  Légumes: { emoji: "🥬", color: "#22c55e", label: "Légumes" },
  "Produits laitiers": { emoji: "🥛", color: "#06b6d4", label: "Produits laitiers" },
  "Viandes & Poissons": { emoji: "🍖", color: "#f43f5e", label: "Viandes & Poissons" },
  Féculents: { emoji: "🍞", color: "#eab308", label: "Féculents" },
  Surgelés: { emoji: "🧊", color: "#3b82f6", label: "Surgelés" },
  Boissons: { emoji: "🥤", color: "#8b5cf6", label: "Boissons" },
  Autre: { emoji: "📦", color: "#94a3b8", label: "Autre" },
};

export function emojiFor(name: string, category: string): string {
  const map: Record<string, string> = {
    // Fruits
    pomme: "🍎", banane: "🍌", orange: "🍊", citron: "🍋", fraise: "🍓",
    framboise: "🫐", raisin: "🍇", poire: "🍐", pêche: "🍑", ananas: "🍍",
    kiwi: "🥝", mangue: "🥭", avocat: "🥑",
    // Légumes
    tomate: "🍅", carotte: "🥕", salade: "🥬", épinard: "🥬", brocoli: "🥦",
    oignon: "🧅", ail: "🧄", pomme_de_terre: "🥔", patate: "🥔", champignon: "🍄",
    poivron: "🫑", concombre: "🥒", courgette: "🥒", aubergine: "🍆", maïs: "🌽",
    // Laitiers
    lait: "🥛", yaourt: "🥛", fromage: "🧀", beurre: "🧈", crème: "🥛", œuf: "🥚", oeuf: "🥚",
    // Viandes
    poulet: "🍗", viande: "🥩", boeuf: "🥩", boeuf: "🥩", porc: "🥓", jambon: "🥓",
    poisson: "🐟", saumon: "🐟", thon: "🐟", crevette: "🦐",
    // Féculents
    pain: "🍞", riz: "🍚", pâtes: "🍝", pates: "🍝", nouilles: "🍜", farine: "🌾",
    céréale: "🥣", semoule: "🍚",
    // Surgelés
    glace: "🍨", pizza: "🍕",
    // Boissons
    eau: "💧", jus: "🧃", café: "☕", thé: "🍵", vin: "🍷", bière: "🍺", soda: "🥤",
    // Autres
    huile: "🫒", sel: "🧂", sucre: "🍬", miel: "🍯", chocolat: "🍫", sauce: "🥫",
    tomate_coulis: "🥫",
  };
  const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "_");
  if (map[key]) return map[key];
  // try category
  const cat = CATEGORY_META[category];
  return cat?.emoji ?? "📦";
}

export function formatDateLong(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function todayISOMidnight(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const FR_DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function dayNameOf(dateISO: string): string {
  const d = new Date(dateISO);
  return FR_DAY_NAMES[(d.getDay() + 6) % 7];
}

/* ------------------------------------------------------------------ */
/*  Storage rules — whether a product should NOT be kept in the fridge */
/* ------------------------------------------------------------------ */

/**
 * Returns true if the given product (by name + category) should be kept OUT
 * of the fridge (i.e. stored at room temperature, like potatoes, onions,
 * bananas, bread, tomatoes whole, etc.). Helps the user avoid bad storage
 * that would shorten shelf-life.
 */
export function outOfFridgeRule(name: string, category: string): string | null {
  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "_");

  // Banane → à mûrir à l'air libre
  if (key === "banane" || key === "bananes")
    return "Gardez à l'air libre — le frigo noircit la peau.";
  // Pomme de terre / oignon / ail / patate douce → frais & sec
  if (
    key === "pomme_de_terre" ||
    key === "patate" ||
    key === "patate_douce" ||
    key === "oignon" ||
    key === "ail" ||
    key === "echalote" ||
    key === "echalotes"
  )
    return "Gardez au frais et au sec — pas au frigo.";
  // Pain → sac en tissu, à température ambiante
  if (key === "pain" || key === "pain_de_mie" || key === "baguette")
    return "Gardez dans un sac en tissu — le frigo rassit le pain.";
  // Tomates entières → comptoir (le frigo tue la saveur)
  if (key === "tomate" || key === "tomates")
    return "Tomates entières : comptoir. Coupées : frigo 2 jours.";
  // Avocat non mûr → comptoir
  if (key === "avocat" || key === "avocats")
    return "Mûrissez à l'air libre, puis frigo 2-3 jours max.";
  // Agrumes entiers → comptoir si < 1 semaine, sinon frigo
  if (
    key === "orange" ||
    key === "oranges" ||
    key === "citron" ||
    key === "citrons" ||
    key === "mandarine" ||
    key === "mandarines" ||
    key === "pamplemousse"
  )
    return "Plus de 7 jours ? Placez au frigo pour les conserver.";
  // Café, miel → jamais au frigo
  if (key === "miel" || key === "cafe" || key === "cafe_en_grains")
    return "À conserver à température ambiante.";
  // Chocolat → pas au frigo (sauf forte chaleur)
  if (key === "chocolat")
    return "À conserver à l'air libre — le frigo blanchit le chocolat.";

  // Surgelés → congélateur, pas le frigo
  if (category === "Surgelés")
    return "À conserver au congélateur à -18°C.";

  return null;
}

export function shouldKeepOutOfFridge(name: string, category: string): boolean {
  return outOfFridgeRule(name, category) !== null;
}

/**
 * Returns an icon (emoji) representing the recommended storage location
 * for a given product. Used in UI hints.
 */
export function storageIcon(name: string, category: string): string {
  if (shouldKeepOutOfFridge(name, category)) return "🏠"; // à l'air libre / comptoir
  if (category === "Surgelés") return "🧊"; // congélateur
  if (category === "Boissons") return "🥤"; // frigo boisson
  if (category === "Fruits" || category === "Légumes") return "🥬"; // bac à légumes
  return "❄️"; // frigo classique
}
