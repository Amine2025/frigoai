"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ShoppingBag,
  Sparkles,
  Wand2,
  CheckCircle2,
  Flame,
  Loader2,
  Utensils,
} from "lucide-react";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { GroceryModal } from "./GroceryModal";
import type { MealDay } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function DayBarSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[125px] flex-1 glass-panel rounded-2xl border border-white/10 p-3 space-y-2"
        >
          <Skeleton className="h-3 w-12 rounded-md" />
          <Skeleton className="h-2.5 w-16 rounded-md" />
          <Skeleton className="h-2.5 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function MealCardSkeleton() {
  return (
    <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-3 w-10 rounded-md" />
      </div>
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyPlan({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel rounded-3xl px-6 py-10 flex flex-col items-center text-center"
    >
      <div className="w-20 h-20 rounded-full glass-panel-emerald flex items-center justify-center mb-4 shadow-lg shadow-[#00C16E]/20">
        <CalendarDays className="w-9 h-9 text-[#00C16E]" />
      </div>
      <h3 className="font-display font-bold text-white text-lg">
        Aucun plan cette semaine
      </h3>
      <p className="text-sm text-gray-400 mt-1.5 mb-5 max-w-[280px]">
        L&apos;IA va composer 21 repas en utilisant en priorité vos produits
        bientôt périmés.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="tap glass-panel-emerald rounded-full px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération en cours…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            Générer mon plan anti-gaspi
          </>
        )}
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Day selector button                                                 */
/* ------------------------------------------------------------------ */

function DayButton({
  day,
  index,
  isSelected,
  onSelect,
}: {
  day: MealDay;
  index: number;
  isSelected: boolean;
  onSelect: (i: number) => void;
}) {
  const isToday = day.dateStr.includes("Aujourd");
  return (
    <button
      onClick={() => onSelect(index)}
      aria-pressed={isSelected}
      aria-label={`Sélectionner ${day.dayName} ${day.dateStr}`}
      className={cn(
        "tap p-3 rounded-2xl border text-left transition-all min-w-[125px] flex-1 cursor-pointer",
        isSelected
          ? "bg-[#00C16E]/20 border-[#00C16E] shadow-md shadow-[#00C16E]/20"
          : "glass-panel border-white/10 hover:border-white/20"
      )}
    >
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-bold text-white">{day.dayName}</span>
        {isToday && (
          <span
            className="w-2 h-2 rounded-full bg-[#00C16E] animate-pulse"
            aria-label="Aujourd'hui"
          />
        )}
      </div>
      <p className="text-[10px] text-gray-400 truncate">{day.dateStr}</p>
      <div className="mt-2 text-[10px] text-[#00C16E] font-bold flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        <span>{day.totalWasteSavedPercent}% sauvés</span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Meal card                                                          */
/* ------------------------------------------------------------------ */

interface MealCardProps {
  kind: "breakfast" | "lunch" | "dinner";
  title: string;
  cal: number;
  time: string;
  index: number;
}

function MealCard({ kind, title, cal, time, index }: MealCardProps) {
  const styles = {
    breakfast: {
      panel: "glass-panel border-white/10",
      label: "☕ Petit-Déjeuner",
      labelColor: "text-amber-400",
      divider: "border-white/5",
      textMuted: "text-gray-400",
      footer: "✓ Restes valorisés",
      footerColor: "text-[#00C16E] font-medium",
      titleBold: "font-bold",
    },
    lunch: {
      panel: "glass-panel-emerald border-[#00C16E]/40 shadow-lg",
      label: "☀️ Déjeuner (Priorité Frigo)",
      labelColor: "text-[#00C16E]",
      divider: "border-white/10",
      textMuted: "text-gray-300",
      footer: "100% Produits Frigo",
      footerColor: "text-[#00C16E] font-bold",
      titleBold: "font-extrabold",
    },
    dinner: {
      panel: "glass-panel border-white/10",
      label: "🌙 Dîner Léger",
      labelColor: "text-blue-400",
      divider: "border-white/5",
      textMuted: "text-gray-400",
      footer: "Digestion optimale",
      footerColor: "text-blue-300 font-medium",
      titleBold: "font-bold",
    },
  }[kind];

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "p-5 rounded-3xl border space-y-3",
        styles.panel
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            styles.labelColor
          )}
        >
          {styles.label}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      <h4
        className={cn(
          "font-display text-base text-white",
          styles.titleBold
        )}
      >
        {title}
      </h4>
      <div
        className={cn(
          "pt-2 border-t flex items-center justify-between text-xs",
          styles.divider,
          styles.textMuted
        )}
      >
        <span className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          {cal} kcal
        </span>
        <span className={styles.footerColor}>{styles.footer}</span>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export function PlanningScreen() {
  const plan = useFrigoStore((s) => s.plan);
  const loadingPlan = useFrigoStore((s) => s.loadingPlan);
  const generating = useFrigoStore((s) => s.generating);
  const selectedDayIndex = useFrigoStore((s) => s.selectedDayIndex);
  const setSelectedDayIndex = useFrigoStore((s) => s.setSelectedDayIndex);
  const setGroceryModalOpen = useFrigoStore((s) => s.setGroceryModalOpen);
  const generatePlan = useFrigoStore((s) => s.generatePlan);
  const fridge = useFrigoStore((s) => s.fridge);

  const safeIndex = Math.min(selectedDayIndex, Math.max(plan.length - 1, 0));
  const selectedDay = plan[safeIndex];

  const usedInPlanCount = useMemo(
    () => fridge.filter((f) => f.usedInPlan).length,
    [fridge]
  );

  const totalCalories = selectedDay
    ? selectedDay.breakfast.cal +
      selectedDay.lunch.cal +
      selectedDay.dinner.cal
    : 0;

  const handleGenerate = async () => {
    await generatePlan();
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-4">
      {/* ---------- Header glass-panel ---------- */}
      <header className="relative rounded-3xl p-5 glass-panel border border-white/10 overflow-hidden shadow-xl">
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00C16E]/20 text-[#00C16E] border border-[#00C16E]/40 text-xs font-bold">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Optimisation Algorithmique 7 Jours</span>
            </div>
            <h2 className="font-display font-black text-2xl text-white leading-tight">
              Planificateur de Repas Anti-Gaspillage
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Chaque repas est agencé par ordre de péremption de votre frigo :
              0% de perte, budget minimal et nutrition équilibrée.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setGroceryModalOpen(true)}
              className="tap flex items-center gap-2 px-4 py-2.5 rounded-xl glass-pill hover:bg-white/10 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#00C16E]" />
              <span>Liste de courses résiduelle</span>
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="tap flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel-emerald text-white font-semibold text-xs border border-[#00C16E]/40 transition-all cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 text-[#00C16E]" />
              )}
              <span>{generating ? "Génération…" : "Régénérer avec l'IA"}</span>
            </button>
          </div>

          {usedInPlanCount > 0 && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <Utensils className="w-3 h-3 text-[#00C16E]" />
              {usedInPlanCount} produit{usedInPlanCount > 1 ? "s" : ""} du frigo
              planifié{usedInPlanCount > 1 ? "s" : ""} cette semaine
            </p>
          )}
        </div>
      </header>

      {/* ---------- Content ---------- */}
      {loadingPlan ? (
        <>
          <DayBarSkeleton />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40 rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MealCardSkeleton />
              <MealCardSkeleton />
              <MealCardSkeleton />
            </div>
          </div>
        </>
      ) : plan.length === 0 ? (
        <EmptyPlan onGenerate={handleGenerate} generating={generating} />
      ) : (
        <>
          {/* Day selector */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {plan.map((day, idx) => (
              <DayButton
                key={`${day.date}-${idx}`}
                day={day}
                index={idx}
                isSelected={safeIndex === idx}
                onSelect={setSelectedDayIndex}
              />
            ))}
          </div>

          {/* Selected day meals */}
          {selectedDay && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display font-bold text-lg text-white leading-tight">
                  Programme du {selectedDay.dayName} ({selectedDay.dateStr})
                </h3>
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 whitespace-nowrap">
                  Score Anti-Gaspi : {selectedDay.totalWasteSavedPercent}%
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Total :{" "}
                  <span className="font-bold text-white">
                    {totalCalories} kcal
                  </span>{" "}
                  pour la journée
                </span>
              </div>

              {/* Re-mount on day change so framer-motion stagger re-triggers */}
              <div
                key={`meals-${safeIndex}`}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <MealCard
                  kind="breakfast"
                  title={selectedDay.breakfast.title}
                  cal={selectedDay.breakfast.cal}
                  time={selectedDay.breakfast.time}
                  index={0}
                />
                <MealCard
                  kind="lunch"
                  title={selectedDay.lunch.title}
                  cal={selectedDay.lunch.cal}
                  time={selectedDay.lunch.time}
                  index={1}
                />
                <MealCard
                  kind="dinner"
                  title={selectedDay.dinner.title}
                  cal={selectedDay.dinner.cal}
                  time={selectedDay.dinner.time}
                  index={2}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- Grocery Modal ---------- */}
      <GroceryModal />
    </div>
  );
}
