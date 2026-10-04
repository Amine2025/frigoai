/**
 * Migration : recalcule les emojis de TOUS les FridgeItems via l'API HTTP.
 * Plus simple : utilise le serveur Next.js qui a déjà la DB connectée.
 *
 * Usage :
 *   bun run scripts/migrate-emojis-api.ts
 *   (le serveur Next.js doit tourner sur http://localhost:3000)
 */

const API = process.env.API_URL || "http://localhost:3000";

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
  if (key.endsWith("s") && map[key.slice(0, -1)]) return map[key.slice(0, -1)];
  if (map[key + "s"]) return map[key + "s"];
  for (const ruleKey of Object.keys(map)) {
    if (ruleKey.length >= 4 && (key.includes(ruleKey) || ruleKey.includes(key))) {
      return map[ruleKey];
    }
  }
  return "📦";
}

async function main() {
  console.log("→ Login au compte démo...");
  const loginResp = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@frigoai.app", password: "demo1234" }),
  });
  const cookie = loginResp.headers.get("set-cookie");
  if (!cookie) {
    console.error("❌ Login échoué — le serveur Next.js tourne-t-il sur " + API + " ?");
    process.exit(1);
  }
  const cookieStr = cookie.split(";")[0];
  console.log("✓ Connecté");

  console.log("→ Récupération du frigo...");
  const fridgeResp = await fetch(`${API}/api/fridge`, {
    headers: { Cookie: cookieStr },
  });
  const { items } = await fridgeResp.json();
  console.log(`→ ${items.length} produits à vérifier\n`);

  let updated = 0;
  for (const item of items) {
    const newEmoji = emojiFor(item.name, item.category);
    if (newEmoji !== item.emoji) {
      console.log(`  ${item.emoji} → ${newEmoji}  ${item.name}`);
      await fetch(`${API}/api/fridge/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookieStr },
        body: JSON.stringify({ emoji: newEmoji }),
      });
      updated += 1;
    }
  }

  console.log(`\n✓ ${updated} produits mis à jour sur ${items.length}`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
