"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChefHat,
  Sparkles,
  Clock,
  Flame,
  Users,
  Flame as FireIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  X,
  UtensilsCrossed,
  Timer,
  Zap,
  Leaf,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil } from "@/lib/fridge-utils";
import type { Recipe, RecipeDifficulty } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MEAL_EMOJI: Record<Recipe["mealType"], string> = {
  "Petit-déjeuner": "🌅",
  Déjeuner: "☀️",
  Dîner: "🌙",
  Goûter: "🍪",
  Apéritif: "🥂",
};

const DIFFICULTY_STYLE: Record<RecipeDifficulty, string> = {
  Facile: "bg-[#00C16E]/15 text-[#00C16E] border-[#00C16E]/30",
  Moyen: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  Difficile: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function tagIcon(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("végé") || t.includes("vegan")) return <Leaf className="w-3 h-3" />;
  if (t.includes("express")) return <Zap className="w-3 h-3" />;
  if (t.includes("proté")) return <FireIcon className="w-3 h-3" />;
  return <Sparkles className="w-3 h-3" />;
}

function formatTotalTime(prep: number, cook: number): string {
  const total = prep + cook;
  if (total === 0) return "—";
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

/* ------------------------------------------------------------------ */
/*  Recipe card                                                        */
/* ------------------------------------------------------------------ */

function RecipeCard({
  recipe,
  index,
  onOpen,
}: {
  recipe: Recipe;
  index: number;
  onOpen: () => void;
}) {
  const fridgeIngredients = recipe.ingredients.filter((i) => i.fromFridge);
  const missingIngredients = recipe.ingredients.filter((i) => !i.fromFridge);

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.07, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onOpen}
      className="tap w-full text-left glass-panel rounded-3xl border border-border overflow-hidden hover:border-[#00C16E]/30 transition-all"
    >
      {/* Top: emoji banner */}
      <div className="relative h-24 bg-gradient-to-br from-[#00C16E]/20 via-white/5 to-transparent flex items-center justify-center">
        <span className="text-5xl drop-shadow-lg" aria-hidden>
          {recipe.emoji}
        </span>
        {/* meal type pill */}
        <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground/40 backdrop-blur-sm border border-border text-foreground flex items-center gap-1">
          {MEAL_EMOJI[recipe.mealType]} {recipe.mealType}
        </span>
        {/* anti-gaspi score */}
        <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C16E]/20 text-[#00C16E] border border-[#00C16E]/40 flex items-center gap-1">
          <Leaf className="w-2.5 h-2.5" />
          {recipe.wasteSavedPercent}% sauvés
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <h4 className="font-display font-bold text-foreground text-base leading-snug line-clamp-2">
          {recipe.title}
        </h4>
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {recipe.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            {formatTotalTime(recipe.prepTimeMin, recipe.cookTimeMin)}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            {recipe.calories} kcal
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-muted-foreground" />
            {recipe.servings} pers.
          </span>
          <span
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold",
              DIFFICULTY_STYLE[recipe.difficulty]
            )}
          >
            {recipe.difficulty}
          </span>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground flex items-center gap-1"
              >
                {tagIcon(tag)}
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients preview */}
        <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[10px]">
          <span className="text-[#00C16E] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {fridgeIngredients.length} du frigo
          </span>
          {missingIngredients.length > 0 && (
            <span className="text-orange-400 font-semibold flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              {missingIngredients.length} à acheter
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Recipe detail (expandable sheet)                                   */
/* ------------------------------------------------------------------ */

function RecipeDetail({
  recipe,
  onClose,
  onCook,
}: {
  recipe: Recipe;
  onClose: () => void;
  onCook: () => void;
}) {
  const [cooking, setCooking] = useState(false);
  const fridgeIngredients = recipe.ingredients.filter((i) => i.fromFridge);
  const missingIngredients = recipe.ingredients.filter((i) => !i.fromFridge);

  const handleCook = async () => {
    const ok = window.confirm(
      `Marquer cette recette comme cuisinée ?\n\nLes ${fridgeIngredients.length} produits du frigo utilisés seront retirés de votre inventaire.`
    );
    if (!ok) return;
    setCooking(true);
    try {
      const removed = await onCook();
      toast.success(`🎉 Recette cuisinée ! ${removed} produit${removed > 1 ? "s" : ""} retiré${removed > 1 ? "s" : ""} du frigo`, {
        description: recipe.title,
      });
      onClose();
    } finally {
      setCooking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-foreground/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.3 }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-strong border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-[#00C16E]/25 via-white/5 to-transparent flex items-center justify-center shrink-0">
          <span className="text-6xl drop-shadow-lg" aria-hidden>
            {recipe.emoji}
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="tap absolute top-3 right-3 w-8 h-8 rounded-xl glass-pill flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground/40 backdrop-blur-sm border border-border text-foreground flex items-center gap-1">
            {MEAL_EMOJI[recipe.mealType]} {recipe.mealType}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto slim-scroll p-5 space-y-4">
          <div>
            <h3 className="font-display font-black text-xl text-foreground leading-tight">
              {recipe.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {recipe.description}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-4 gap-2">
            <MetaTile icon={<Clock className="w-3.5 h-3.5" />} label="Prép." value={`${recipe.prepTimeMin}min`} />
            <MetaTile icon={<Timer className="w-3.5 h-3.5" />} label="Cuisson" value={`${recipe.cookTimeMin}min`} />
            <MetaTile icon={<Flame className="w-3.5 h-3.5 text-amber-400" />} label="Calories" value={`${recipe.calories}`} />
            <MetaTile icon={<Users className="w-3.5 h-3.5" />} label="Pers." value={`${recipe.servings}`} />
          </div>

          {/* Tags + difficulty + anti-gaspi */}
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full border",
                DIFFICULTY_STYLE[recipe.difficulty]
              )}
            >
              {recipe.difficulty}
            </span>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#00C16E]/15 text-[#00C16E] border border-[#00C16E]/30 flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              {recipe.wasteSavedPercent}% anti-gaspi
            </span>
            {recipe.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold px-2 py-1 rounded-full bg-muted/50 border border-border text-muted-foreground flex items-center gap-1"
              >
                {tagIcon(tag)}
                {tag}
              </span>
            ))}
          </div>

          {/* Ingredients */}
          <div>
            <h4 className="font-display font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-[#00C16E]" />
              Ingrédients
            </h4>
            <div className="space-y-1.5">
              {fridgeIngredients.map((ing, i) => (
                <div
                  key={`f-${i}`}
                  className="flex items-center justify-between text-xs p-2.5 rounded-xl glass-panel-emerald border border-[#00C16E]/30"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C16E]" />
                    {ing.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{ing.qty}</span>
                </div>
              ))}
              {missingIngredients.map((ing, i) => (
                <div
                  key={`m-${i}`}
                  className="flex items-center justify-between text-xs p-2.5 rounded-xl glass-panel border border-orange-500/20"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
                    {ing.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{ing.qty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="font-display font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-[#00C16E]" />
              Préparation
            </h4>
            <ol className="space-y-2.5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#00C16E] text-black text-[11px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer: cook button */}
        <div className="px-5 py-4 border-t border-border shrink-0 safe-bottom">
          <button
            onClick={handleCook}
            disabled={cooking}
            className="tap w-full glass-panel-emerald rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-foreground disabled:opacity-50"
          >
            {cooking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Mise à jour du frigo…
              </>
            ) : (
              <>
                <ChefHat className="w-4 h-4" strokeWidth={2.4} />
                J'ai cuisiné ça
              </>
            )}
          </button>
          <p className="text-[10px] text-gray-500 text-center mt-2">
            Les {fridgeIngredients.length} produits du frigo seront retirés de l'inventaire
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetaTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-pill rounded-2xl p-2.5 flex flex-col items-center gap-1 border border-border">
      {icon}
      <span className="font-display font-bold text-xs text-foreground leading-none">
        {value}
      </span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton + empty state                                             */
/* ------------------------------------------------------------------ */

function RecipeSkeleton() {
  return (
    <div className="glass-panel rounded-3xl border border-border overflow-hidden">
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-5/6 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onGenerate, fridgeEmpty }: { onGenerate: () => void; fridgeEmpty: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel rounded-3xl px-6 py-12 flex flex-col items-center text-center mt-6"
    >
      <div className="w-24 h-24 rounded-full glass-panel-emerald flex items-center justify-center text-5xl mb-5 shadow-lg shadow-[#00C16E]/20">
        🍳
      </div>
      <h3 className="font-display font-bold text-foreground text-lg">
        Idées recettes anti-gaspi
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 mb-5 max-w-[280px]">
        {fridgeEmpty
          ? "Ajoutez des produits dans votre frigo pour que l'IA propose des recettes qui les utilisent."
          : "L'IA va créer 4 recettes créatives qui valorisent vos produits bientôt périmés."}
      </p>
      <button
        onClick={onGenerate}
        disabled={fridgeEmpty}
        className="tap glass-panel-emerald rounded-full px-5 py-2.5 text-sm font-semibold text-foreground flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" /> Générer des recettes
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export function RecipesScreen() {
  const fridge = useFrigoStore((s) => s.fridge);
  const recipes = useFrigoStore((s) => s.recipes);
  const loading = useFrigoStore((s) => s.loadingRecipes);
  const error = useFrigoStore((s) => s.recipesError);
  const generate = useFrigoStore((s) => s.generateRecipes);
  const cookRecipe = useFrigoStore((s) => s.cookRecipe);

  const [selected, setSelected] = useState<Recipe | null>(null);

  const residualItems = useMemo(() => {
    return fridge.filter((it) => {
      const d = daysUntil(it.expirationDate);
      return d <= 5; // residual = expiring within 5 days
    });
  }, [fridge]);

  const handleGenerate = async () => {
    const ok = await generate();
    if (!ok && error) {
      toast.error(error);
    }
  };

  const handleCook = async (recipe: Recipe) => {
    const removed = await cookRecipe(recipe);
    return removed;
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6">
      {/* ---------- Header ---------- */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00C16E]/20 text-[#00C16E] border border-[#00C16E]/40 text-[10px] font-bold mb-1.5">
            <ChefHat className="w-3 h-3" />
            ChefGaspi IA
          </div>
          <h2 className="font-display font-black text-2xl text-foreground leading-tight">
            Recettes Anti-Gaspi
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fridge.length > 0
              ? `${residualItems.length} produit${residualItems.length > 1 ? "s" : ""} à valoriser`
              : "Le frigo est vide"}
          </p>
        </div>
        {recipes.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="tap glass-panel-emerald rounded-full h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Régénérer
          </button>
        )}
      </header>

      {/* ---------- Residual items strip ---------- */}
      {fridge.length > 0 && (
        <section className="mt-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">
            🥬 Produits à valoriser en priorité
          </p>
          {residualItems.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic px-1">
              Aucun produit urgent — profitez-en pour vider les restes frais !
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {residualItems.slice(0, 12).map((it) => {
                const d = daysUntil(it.expirationDate);
                const urgent = d <= 2;
                return (
                  <div
                    key={it.id}
                    className={cn(
                      "shrink-0 min-w-[80px] glass-pill rounded-2xl px-2.5 py-2 flex flex-col items-center gap-0.5 border",
                      urgent
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-border"
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {it.emoji}
                    </span>
                    <span className="text-[10px] font-semibold text-foreground truncate w-full text-center">
                      {it.name}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold",
                        urgent ? "text-orange-400" : "text-yellow-400"
                      )}
                    >
                      {d < 0 ? "Périmé" : d === 0 ? "Auj." : `${d}j`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------- Content ---------- */}
      <div className="mt-5 space-y-4">
        {/* Error */}
        {error && !loading && recipes.length === 0 && (
          <div className="glass-panel rounded-2xl p-4 border border-orange-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Génération échouée</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button
                onClick={handleGenerate}
                className="tap mt-2 text-xs font-semibold text-[#00C16E] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <>
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-8 h-8 text-[#00C16E] animate-spin mb-3" />
              <p className="font-display font-bold text-foreground text-sm">
                ChefGaspi réfléchit…
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Composition de recettes avec vos produits résiduels
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <RecipeSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {/* Empty */}
        {!loading && recipes.length === 0 && (
          <EmptyState onGenerate={handleGenerate} fridgeEmpty={fridge.length === 0} />
        )}

        {/* Recipes grid */}
        {!loading && recipes.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {recipes.map((recipe, i) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                index={i}
                onOpen={() => setSelected(recipe)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Detail modal ---------- */}
      <AnimatePresence>
        {selected && (
          <RecipeDetail
            recipe={selected}
            onClose={() => setSelected(null)}
            onCook={() => handleCook(selected)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
