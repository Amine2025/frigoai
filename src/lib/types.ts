// FrigoAi shared types

export type FridgeCategory =
  | "Fruits"
  | "Légumes"
  | "Produits laitiers"
  | "Viandes & Poissons"
  | "Féculents"
  | "Surgelés"
  | "Boissons"
  | "Autre";

export interface FridgeItem {
  id: string;
  name: string;
  category: FridgeCategory;
  quantity: number;
  unit: string;
  expirationDate: string; // ISO
  addedAt: string;
  emoji: string;
  usedInPlan: boolean;
}

export interface MealDay {
  date: string; // YYYY-MM-DD
  dayName: string;
  dateStr: string;
  breakfast: { title: string; cal: number; time: string };
  lunch: { title: string; cal: number; time: string };
  dinner: { title: string; cal: number; time: string };
  totalWasteSavedPercent: number;
}

export interface GroceryItem {
  id: string;
  item: string;
  qty: string;
  store: string;
  checked: boolean;
  estimatedPrice: number;
}

export interface DashboardStats {
  totalItems: number;
  expiringSoon: number; // <= 3 days
  expired: number;
  totalCaloriesPlanned: number;
  wasteSavedPercent: number;
  estimatedSavings: number; // €
}

// Result of an AI vision scan of a fridge photo
export interface ScannedItem {
  name: string;
  category: FridgeCategory;
  quantity: number;
  unit: string;
  estimatedExpirationDays: number;
  emoji: string;
  confidence: number; // 0-1
}

// AI-generated anti-waste recipe using residual fridge items
export interface RecipeIngredient {
  name: string;
  qty: string;
  fromFridge: boolean; // true = already in fridge, false = missing
}

export type RecipeDifficulty = "Facile" | "Moyen" | "Difficile";

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  mealType: "Petit-déjeuner" | "Déjeuner" | "Dîner" | "Goûter" | "Apéritif";
  description: string;
  prepTimeMin: number;
  cookTimeMin: number;
  difficulty: RecipeDifficulty;
  servings: number;
  calories: number;
  tags: string[]; // e.g. ["Végétarien", "Anti-gaspi", "Express", "Sans gluten"]
  wasteSavedPercent: number; // % of residual items used
  ingredients: RecipeIngredient[];
  steps: string[];
}
