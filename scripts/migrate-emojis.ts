/**
 * Migration : recalcule les emojis de TOUS les FridgeItems existants en DB
 * en utilisant le catalogue emojiFor() à jour.
 *
 * Usage (local dev) : bun run scripts/migrate-emojis.ts
 * Usage (prod Neon): DATABASE_URL="postgresql://..." npx tsx scripts/migrate-emojis.ts
 */

// Inline emojiFor to avoid path resolution issues
const CATEGORY_META: Record<string, { emoji: string }> = {
  "Fruits": { emoji: "🍎" },
  "Légumes": { emoji: "🥬" },
  "Produits laitiers": { emoji: "🥛" },
  "Viandes & Poissons": { emoji: "🍖" },
  "Féculents": { emoji: "🍞" },
  "Surgelés": { emoji: "🧊" },
  "Boissons": { emoji: "🥤" },
  "Autre": { emoji: "📦" },
};

function emojiFor(name: string, category: string): string {
  const map: Record<string, string> = {
    "pomme": "🍎", "pommes": "🍎",
    "banane": "🍌", "bananes": "🍌",
    "orange": "🍊", "oranges": "🍊",
    "citron": "🍋", "citrons": "🍋",
    "fraise": "🍓", "fraises": "🍓",
    "framboise": "🫐", "framboises": "🫐",
    "myrtille": "🫐", "myrtilles": "🫐",
    "raisin": "🍇",
    "poire": "🍐", "poires": "🍐",
    "peche": "🍑", "peches": "🍑",
    "ananas": "🍍",
    "kiwi": "🥝", "kiwis": "🥝",
    "mangue": "🥭", "mangues": "🥭",
    "avocat": "🥑", "avocats": "🥑",
    "abricot": "🍊", "abricots": "🍊",
    "mandarine": "🍊", "mandarines": "🍊",
    "pamplemousse": "🍊",
    "melon": "🍈", "melons": "🍈",
    "pasteque": "🍉", "pasteques": "🍉",
    "cerise": "🍒", "cerises": "🍒",
    "tomate": "🍅", "tomates": "🍅",
    "carotte": "🥕", "carottes": "🥕",
    "salade": "🥬", "laitue": "🥬",
    "epinard": "🥬", "epinards": "🥬",
    "brocoli": "🥦", "brocolis": "🥦",
    "oignon": "🧅", "oignons": "🧅",
    "ail": "🧄",
    "echalote": "🧅", "echalotes": "🧅",
    "poireau": "🥬", "poireaux": "🥬",
    "pomme_de_terre": "🥔", "patate": "🥔", "patates": "🥔",
    "champignon": "🍄", "champignons": "🍄",
    "poivron": "🫑", "poivrons": "🫑",
    "concombre": "🥒", "concombres": "🥒",
    "courgette": "🥒", "courgettes": "🥒",
    "aubergine": "🍆", "aubergines": "🍆",
    "mais": "🌽",
    "courge": "🎃", "potiron": "🎃", "citrouille": "🎃",
    "chou": "🥬", "choux": "🥬",
    "chou_fleur": "🥦", "choux_fleurs": "🥦",
    "lait": "🥛", "lait_demi_ecreme": "🥛", "lait_demi_écrémé": "🥛",
    "yaourt": "🥛", "yaourts": "🥛", "yaourt_nature": "🥛",
    "fromage": "🧀", "fromages": "🧀",
    "fromage_rappe": "🧀", "fromage_râpé": "🧀",
    "beurre": "🧈",
    "creme": "🥛", "creme_fraiche": "🥛",
    "oeuf": "🥚", "oeufs": "🥚",
    "poulet": "🍗", "poulets": "🍗",
    "viande": "🥩", "viandes": "🥩",
    "boeuf": "🥩", "boeuf_hache": "🥩", "steak": "🥩",
    "porc": "🥓", "cochon": "🥓",
    "jambon": "🥓", "jambons": "🥓",
    "saucisse": "🌭", "saucisses": "🌭", "merguez": "🌭",
    "bacon": "🥓", "lard": "🥓", "lardons": "🥓",
    "agneau": "🍗", "mouton": "🍗", "veau": "🍗",
    "canard": "🦆", "dinde": "🦃",
    "poisson": "🐟", "poissons": "🐟",
    "saumon": "🐟", "saumon_frais": "🐟", "saumon_fume": "🐟",
    "thon": "🐟",
    "cabillaud": "🐟", "morue": "🐟",
    "sardine": "🐟", "anchois": "🐟",
    "crevette": "🦐", "crevettes": "🦐", "gambas": "🦐",
    "crabe": "🦀", "tourteau": "🦀",
    "moule": "🦪", "moules": "🦪",
    "huitre": "🦪", "huitres": "🦪",
    "calamars": "🦑", "encornet": "🦑", "poulpe": "🐙",
    "pain": "🍞", "pains": "🍞",
    "pain_de_mie": "🍞", "baguette": "🥖", "baguettes": "🥖",
    "pain_complet": "🍞",
    "riz": "🍚", "riz_basmati": "🍚", "riz_complet": "🍚",
    "pates": "🍝", "pâtes": "🍝", "spaghetti": "🍝", "penne": "🍝",
    "pates_penne": "🍝", "pâtes_penne": "🍝",
    "nouilles": "🍜", "ramen": "🍜",
    "farine": "🌾",
    "cereale": "🥣", "cereales": "🥣", "céréale": "🥣", "céréales": "🥣",
    "muesli": "🥣", "flocons_avoine": "🥣",
    "semoule": "🍚", "couscous": "🍚", "boulgour": "🍚", "quinoa": "🌾",
    "biscuit": "🍪", "biscuits": "🍪", "cookie": "🍪", "cookies": "🍪",
    "brioche": "🍞", "croissant": "🥐",
    "pizza": "🍕",
    "crepe": "🥞", "crepes": "🥞", "pancake": "🥞", "gaufre": "🧇",
    "glace": "🍨", "glaces": "🍨", "sorbet": "🍨",
    "eau": "💧", "eau_gazeuse": "💧", "eau_minerale": "💧",
    "jus": "🧃", "jus_d_orange": "🧃", "jus_de_pomme": "🧃",
    "smoothie": "🥤",
    "cafe": "☕", "the": "🍵", "vin": "🍷", "biere": "🍺",
    "champagne": "🍾", "soda": "🥤", "coca": "🥤",
    "huile": "🫒", "huile_olive": "🫒",
    "vinaigre": "🍶",
    "sel": "🧂",
    "sucre": "🍬", "sucre_de_canne": "🍬",
    "miel": "🍯", "confiture": "🍓", "marmelade": "🍊",
    "chocolat": "🍫",
    "noix": "🌰", "noisette": "🌰", "amande": "🌰",
    "pistache": "🌰",
    "sauce": "🥫", "sauce_tomate": "🥫", "coulis": "🥫",
    "mayonnaise": "🥚", "ketchup": "🍅",
    "olive": "🫒", "olives": "🫒",
    "cornichon": "🥒", "cornichons": "🥒",
  };

  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s'_\-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (map[key]) return map[key];

  // Try plural/singular
  if (key.endsWith("s") && map[key.slice(0, -1)]) return map[key.slice(0, -1)];
  if (map[key + "s"]) return map[key + "s"];

  // Partial match
  for (const ruleKey of Object.keys(map)) {
    if (ruleKey.length >= 4 && (key.includes(ruleKey) || ruleKey.includes(key))) {
      return map[ruleKey];
    }
  }

  // Fallback to category emoji
  return CATEGORY_META[category]?.emoji ?? "📦";
}

async function main() {
  // Force PGlite in dev (DATABASE_URL is a placeholder)
  const usePglite =
    !process.env.DATABASE_URL ||
    process.env.DATABASE_URL.startsWith("postgresql://postgres:postgres@localhost") ||
    process.env.DATABASE_URL.startsWith("pglite:");

  let pgClient: any;

  if (!usePglite) {
    const { createRequire } = await import("module");
    const require_ = createRequire(import.meta.url);
    const pg = require_("pg");
    pgClient = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pgClient.connect();
    console.log("✓ Connecté à Neon (prod)");
  } else {
    const { createRequire } = await import("module");
    const require_ = createRequire(import.meta.url);
    const { PGlite } = require_("@electric-sql/pglite");
    pgClient = new PGlite({
      dataDir: "./db/frigoai-pgdata",
      options: { fsync: false },
    });
    await pgClient.waitReady?.catch(() => {});
    console.log("✓ Connecté à PGlite (dev)");
  }

  // Récupère tous les items
  const result = await pgClient.query(
    `SELECT id, name, category, emoji FROM "FridgeItem"`
  );
  console.log(`→ ${result.rows.length} produits à vérifier`);

  let updated = 0;
  for (const row of result.rows) {
    const newEmoji = emojiFor(row.name, row.category);
    if (newEmoji !== row.emoji) {
      await pgClient.query(
        `UPDATE "FridgeItem" SET emoji = $1 WHERE id = $2`,
        [newEmoji, row.id]
      );
      console.log(`  ${row.emoji} → ${newEmoji}  ${row.name}`);
      updated += 1;
    }
  }

  console.log(`✓ ${updated} produits mis à jour sur ${result.rows.length}`);
  await pgClient.end();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
