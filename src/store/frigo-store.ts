"use client";

import { create } from "zustand";
import type {
  FridgeItem,
  MealDay,
  GroceryItem,
  DashboardStats,
  FridgeCategory,
  ScannedItem,
  Recipe,
} from "@/lib/types";

export type TabKey = "frigo" | "recipes" | "planning" | "courses" | "profil";

export interface FrigoUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

interface FrigoState {
  // navigation
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;

  // auth
  user: FrigoUser | null;
  loadingUser: boolean;
  authChecked: boolean;
  fetchCurrentUser: () => Promise<FrigoUser | null>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (
    email: string
  ) => Promise<{ ok: boolean; resetCode?: string; error?: string }>;
  resetPassword: (
    email: string,
    resetCode: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;

  // data
  fridge: FridgeItem[];
  plan: MealDay[];
  grocery: GroceryItem[];
  stats: DashboardStats | null;

  // loading flags
  loadingFridge: boolean;
  loadingPlan: boolean;
  loadingGrocery: boolean;
  generating: boolean;

  // meal planner UI
  selectedDayIndex: number;
  setSelectedDayIndex: (i: number) => void;
  isGroceryModalOpen: boolean;
  setGroceryModalOpen: (v: boolean) => void;
  isAddItemOpen: boolean;
  setAddItemOpen: (v: boolean) => void;

  // scan (camera) UI
  isScanModalOpen: boolean;
  setScanModalOpen: (v: boolean) => void;
  scanning: boolean;
  scanResults: ScannedItem[];
  scanError: string | null;
  setScanResults: (items: ScannedItem[]) => void;
  setScanError: (msg: string | null) => void;
  scanImage: (dataUrl: string) => Promise<boolean>;
  addScannedItems: (selected: ScannedItem[]) => Promise<number>;
  resetScan: () => void;

  // recipes (anti-gaspi ideas)
  recipes: Recipe[];
  loadingRecipes: boolean;
  recipesError: string | null;
  generateRecipes: () => Promise<boolean>;
  setRecipesError: (msg: string | null) => void;
  resetRecipes: () => void;
  cookRecipe: (recipe: Recipe) => Promise<number>;

  // setters
  setFridge: (items: FridgeItem[]) => void;
  setPlan: (days: MealDay[]) => void;
  setGrocery: (items: GroceryItem[]) => void;
  setStats: (s: DashboardStats | null) => void;
  setLoading: (
    key: "fridge" | "plan" | "grocery" | "generating",
    v: boolean
  ) => void;

  // actions
  refreshAll: () => Promise<void>;
  refreshFridge: () => Promise<void>;
  refreshPlan: () => Promise<void>;
  refreshGrocery: () => Promise<void>;
  refreshStats: () => Promise<void>;
  addItem: (data: {
    name: string;
    category: FridgeCategory;
    quantity: number;
    unit: string;
    expirationDate: string;
    emoji?: string;
  }) => Promise<boolean>;
  updateItem: (
    id: string,
    data: Partial<FridgeItem>
  ) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  generatePlan: () => Promise<boolean>;
  toggleGrocery: (id: string, checked: boolean) => Promise<void>;
  deleteGrocery: (id: string) => Promise<void>;
  addGrocery: (data: {
    item: string;
    qty: string;
    store: string;
    estimatedPrice?: number;
  }) => Promise<boolean>;
  seedDemo: () => Promise<boolean>;
}

const todayMonday = (() => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
})();

export const useFrigoStore = create<FrigoState>((set, get) => ({
  activeTab: "frigo",
  setActiveTab: (t) => set({ activeTab: t }),

  // ---------- AUTH ----------
  user: null,
  loadingUser: false,
  authChecked: false,

  fetchCurrentUser: async () => {
    set({ loadingUser: true });
    try {
      const r = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await r.json();
      const user = (data?.user ?? null) as FrigoUser | null;
      set({ user, authChecked: true });
      return user;
    } catch {
      set({ user: null, authChecked: true });
      return null;
    } finally {
      set({ loadingUser: false });
    }
  },

  login: async (email, password) => {
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Échec de la connexion");
      }
      const data = await r.json();
      set({ user: data.user as FrigoUser, authChecked: true });
      return true;
    } catch {
      return false;
    }
  },

  register: async (email, password, name, phone) => {
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Échec de l'inscription");
      }
      const data = await r.json();
      set({ user: data.user as FrigoUser, authChecked: true });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    } finally {
      set({
        user: null,
        authChecked: true,
        fridge: [],
        plan: [],
        grocery: [],
        stats: null,
        recipes: [],
      });
    }
  },

  forgotPassword: async (email) => {
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ok: false, error: data?.error || "Échec de la demande" };
      }
      return { ok: true, resetCode: data.resetCode as string | undefined };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      return { ok: false, error: msg };
    }
  },

  resetPassword: async (email, resetCode, newPassword) => {
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode, newPassword }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ok: false, error: data?.error || "Échec de la réinitialisation" };
      }
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      return { ok: false, error: msg };
    }
  },

  fridge: [],
  plan: [],
  grocery: [],
  stats: null,

  loadingFridge: false,
  loadingPlan: false,
  loadingGrocery: false,
  generating: false,

  selectedDayIndex: 0,
  setSelectedDayIndex: (i) => set({ selectedDayIndex: i }),
  isGroceryModalOpen: false,
  setGroceryModalOpen: (v) => set({ isGroceryModalOpen: v }),
  isAddItemOpen: false,
  setAddItemOpen: (v) => set({ isAddItemOpen: v }),

  // scan (camera)
  isScanModalOpen: false,
  setScanModalOpen: (v) => set({ isScanModalOpen: v }),
  scanning: false,
  scanResults: [],
  scanError: null,
  setScanResults: (items) => set({ scanResults: items }),
  setScanError: (msg) => set({ scanError: msg }),
  resetScan: () => set({ scanResults: [], scanError: null, scanning: false }),

  scanImage: async (dataUrl) => {
    set({ scanning: true, scanError: null, scanResults: [] });
    try {
      const r = await fetch("/api/scan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Échec de l'analyse");
      }
      const data = await r.json();
      set({ scanResults: (data.items as ScannedItem[]) ?? [] });
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur d'analyse";
      set({ scanError: msg });
      return false;
    } finally {
      set({ scanning: false });
    }
  },

  addScannedItems: async (selected) => {
    let added = 0;
    for (const it of selected) {
      const exp = new Date();
      exp.setDate(exp.getDate() + it.estimatedExpirationDays);
      const ok = await get().addItem({
        name: it.name,
        category: it.category,
        quantity: it.quantity,
        unit: it.unit,
        expirationDate: exp.toISOString(),
        emoji: it.emoji,
      });
      if (ok) added += 1;
    }
    return added;
  },

  // ---- recipes (anti-gaspi ideas) ----
  recipes: [],
  loadingRecipes: false,
  recipesError: null,
  setRecipesError: (msg) => set({ recipesError: msg }),
  resetRecipes: () => set({ recipes: [], recipesError: null, loadingRecipes: false }),

  generateRecipes: async () => {
    const fridge = get().fridge;
    if (fridge.length === 0) {
      set({ recipesError: "Votre frigo est vide. Ajoutez des produits d'abord." });
      return false;
    }
    set({ loadingRecipes: true, recipesError: null });
    try {
      const payload = {
        items: fridge
          .slice()
          .sort(
            (a, b) =>
              new Date(a.expirationDate).getTime() -
              new Date(b.expirationDate).getTime()
          )
          .map((it) => ({
            name: it.name,
            category: it.category,
            quantity: it.quantity,
            unit: it.unit,
            daysLeft: Math.round(
              (new Date(it.expirationDate).getTime() - Date.now()) / 86400000
            ),
          })),
      };
      const r = await fetch("/api/recipes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Échec de la génération");
      }
      const data = await r.json();
      set({ recipes: (data.recipes as Recipe[]) ?? [] });
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur de génération";
      set({ recipesError: msg });
      return false;
    } finally {
      set({ loadingRecipes: false });
    }
  },

  // "J'ai cuisiné ça" — delete the fridge items used in the recipe (fromFridge true)
  cookRecipe: async (recipe) => {
    let removed = 0;
    const fridge = get().fridge;
    const usedNames = recipe.ingredients
      .filter((ing) => ing.fromFridge)
      .map((ing) => ing.name.toLowerCase().trim());
    if (usedNames.length === 0) return 0;
    for (const item of fridge) {
      if (usedNames.includes(item.name.toLowerCase().trim())) {
        const ok = await get().deleteItem(item.id);
        if (ok) removed += 1;
      }
    }
    return removed;
  },

  setFridge: (items) => set({ fridge: items }),
  setPlan: (days) => set({ plan: days, selectedDayIndex: 0 }),
  setGrocery: (items) => set({ grocery: items }),
  setStats: (s) => set({ stats: s }),
  setLoading: (key, v) =>
    set(
      key === "fridge"
        ? { loadingFridge: v }
        : key === "plan"
        ? { loadingPlan: v }
        : key === "grocery"
        ? { loadingGrocery: v }
        : { generating: v }
    ),

  refreshFridge: async () => {
    set({ loadingFridge: true });
    try {
      const r = await fetch("/api/fridge", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await r.json();
      set({ fridge: data.items ?? [] });
    } finally {
      set({ loadingFridge: false });
    }
  },

  refreshPlan: async () => {
    set({ loadingPlan: true });
    try {
      const r = await fetch(
        `/api/meal-plan?weekStart=${encodeURIComponent(todayMonday)}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await r.json();
      set({ plan: data.days ?? [] });
    } finally {
      set({ loadingPlan: false });
    }
  },

  refreshGrocery: async () => {
    set({ loadingGrocery: true });
    try {
      const r = await fetch("/api/grocery", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await r.json();
      set({ grocery: data.items ?? [] });
    } finally {
      set({ loadingGrocery: false });
    }
  },

  refreshStats: async () => {
    try {
      const r = await fetch("/api/stats", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await r.json();
      set({ stats: data.stats ?? null });
    } catch {
      /* ignore */
    }
  },

  refreshAll: async () => {
    const s = get();
    await Promise.all([
      s.refreshFridge(),
      s.refreshPlan(),
      s.refreshGrocery(),
      s.refreshStats(),
    ]);
  },

  addItem: async (data) => {
    try {
      const r = await fetch("/api/fridge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) return false;
      await get().refreshFridge();
      await get().refreshStats();
      return true;
    } catch {
      return false;
    }
  },

  updateItem: async (id, data) => {
    try {
      const r = await fetch(`/api/fridge/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) return false;
      await get().refreshFridge();
      await get().refreshStats();
      return true;
    } catch {
      return false;
    }
  },

  deleteItem: async (id) => {
    try {
      const r = await fetch(`/api/fridge/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) return false;
      await get().refreshFridge();
      await get().refreshStats();
      return true;
    } catch {
      return false;
    }
  },

  generatePlan: async () => {
    set({ generating: true });
    try {
      const r = await fetch("/api/meal-plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: todayMonday }),
      });
      if (!r.ok) return false;
      await Promise.all([get().refreshPlan(), get().refreshGrocery(), get().refreshStats()]);
      return true;
    } catch {
      return false;
    } finally {
      set({ generating: false });
    }
  },

  toggleGrocery: async (id, checked) => {
    // optimistic
    set((s) => ({
      grocery: s.grocery.map((g) => (g.id === id ? { ...g, checked } : g)),
    }));
    try {
      await fetch(`/api/grocery/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
    } catch {
      /* ignore */
    }
  },

  deleteGrocery: async (id) => {
    set((s) => ({ grocery: s.grocery.filter((g) => g.id !== id) }));
    try {
      await fetch(`/api/grocery/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
  },

  addGrocery: async (data) => {
    try {
      const r = await fetch("/api/grocery", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) return false;
      await get().refreshGrocery();
      return true;
    } catch {
      return false;
    }
  },

  seedDemo: async () => {
    try {
      const r = await fetch("/api/seed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!r.ok) return false;
      await get().refreshAll();
      return true;
    } catch {
      return false;
    }
  },
}));

export { todayMonday };
