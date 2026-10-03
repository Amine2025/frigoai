"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Copy,
  Store,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroceryItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STORE_OPTIONS = [
  "Supermarché",
  "Marché",
  "Épicerie",
  "Boulangerie",
  "Autre",
] as const;

function formatEuro(value: number): string {
  return (
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function sortItems(items: GroceryItem[]): GroceryItem[] {
  // Unchecked first, then checked. Stable within each group (preserve original order).
  return [...items].sort((a, b) => {
    if (a.checked === b.checked) return 0;
    return a.checked ? 1 : -1;
  });
}

/* ------------------------------------------------------------------ */
/*  Custom round checkbox                                              */
/* ------------------------------------------------------------------ */

function RoundCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onToggle(!checked)}
      className={cn(
        "tap shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
        checked
          ? "bg-[#00C16E] border-[#00C16E] text-black"
          : "bg-white/5 border-white/25 text-transparent hover:border-[#00C16E]/60"
      )}
    >
      <Check className="w-3.5 h-3.5" strokeWidth={3.5} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Grocery row                                                        */
/* ------------------------------------------------------------------ */

function GroceryRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem;
  onToggle: (next: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-3 flex items-center gap-3",
        item.checked && "opacity-50"
      )}
    >
      <RoundCheckbox
        checked={item.checked}
        onToggle={onToggle}
        label={`Marquer ${item.item} comme ${item.checked ? "à acheter" : "acheté"}`}
      />

      {/* Left content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-semibold text-white text-sm truncate transition-all",
            item.checked && "line-through"
          )}
        >
          {item.item}
        </p>
        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
          <Store className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{item.store}</span>
        </p>
      </div>

      {/* Right: qty + price + trash */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[#00C16E] font-bold text-xs whitespace-nowrap">
            {item.qty}
          </span>
          <span className="text-[10px] text-gray-300 whitespace-nowrap">
            {formatEuro(item.estimatedPrice ?? 0)}
          </span>
        </div>
        <button
          onClick={onDelete}
          aria-label={`Supprimer ${item.item}`}
          className="tap w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton + Empty state                                             */
/* ------------------------------------------------------------------ */

function GroceryRowSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-3 flex items-center gap-3">
      <Skeleton className="w-6 h-6 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-2.5 w-1/3 rounded-md" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-3 w-8 rounded-md" />
          <Skeleton className="h-2.5 w-10 rounded-md" />
        </div>
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel rounded-3xl px-6 py-12 flex flex-col items-center text-center mt-4"
    >
      <div className="w-24 h-24 rounded-full glass-panel-emerald flex items-center justify-center text-5xl mb-5 shadow-lg shadow-[#00C16E]/20">
        🛒
      </div>
      <h3 className="font-display font-bold text-white text-lg">
        Liste de courses vide
      </h3>
      <p className="text-sm text-gray-400 mt-1.5 mb-5 max-w-[260px]">
        Générez votre plan de repas pour obtenir automatiquement la liste des
        articles manquants.
      </p>
      <button
        onClick={onGenerate}
        className="tap glass-panel-emerald rounded-full px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" /> Générer le plan
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-item form                                                      */
/* ------------------------------------------------------------------ */

function AddItemForm({ disabled }: { disabled: boolean }) {
  const addGrocery = useFrigoStore((s) => s.addGrocery);

  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [store, setStore] = useState<string>(STORE_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = item.trim();
    if (!name) {
      toast.error("Saisissez un nom d'article");
      return;
    }
    setSubmitting(true);
    const ok = await addGrocery({
      item: name,
      qty: qty.trim() || "1",
      store,
    });
    setSubmitting(false);
    if (ok) {
      toast.success("✓ Article ajouté", {
        description: `${name} — ${qty.trim() || "1"} · ${store}`,
      });
      setItem("");
      setQty("1");
      // Keep the selected store for repeated additions (common shopping pattern).
    } else {
      toast.error("Impossible d'ajouter l'article");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-pill rounded-2xl p-3 flex items-center gap-2"
    >
      <input
        type="text"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        placeholder="Ajouter un article…"
        aria-label="Nom de l'article"
        className="flex-1 min-w-0 h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-[#00C16E]/60"
      />
      <input
        type="text"
        inputMode="numeric"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qté"
        aria-label="Quantité"
        className="w-14 h-10 rounded-xl bg-white/5 border border-white/10 px-2 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-[#00C16E]/60 text-center"
      />
      <Select value={store} onValueChange={setStore}>
        <SelectTrigger
          aria-label="Magasin"
          className="h-10 w-[8.5rem] rounded-xl bg-white/5 border-white/10 text-xs text-white px-3 gap-1.5"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {STORE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="submit"
        disabled={submitting || disabled}
        aria-label="Ajouter l'article"
        className="tap shrink-0 w-10 h-10 rounded-xl glass-panel-emerald flex items-center justify-center text-white disabled:opacity-60 disabled:pointer-events-none"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        )}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export function CoursesScreen() {
  const grocery = useFrigoStore((s) => s.grocery);
  const loadingGrocery = useFrigoStore((s) => s.loadingGrocery);
  const generating = useFrigoStore((s) => s.generating);
  const toggleGrocery = useFrigoStore((s) => s.toggleGrocery);
  const deleteGrocery = useFrigoStore((s) => s.deleteGrocery);
  const generatePlan = useFrigoStore((s) => s.generatePlan);

  const totals = useMemo(() => {
    const total = grocery.length;
    const checked = grocery.filter((g) => g.checked).length;
    const totalPrice = grocery.reduce(
      (sum, g) => sum + (g.estimatedPrice ?? 0),
      0
    );
    const progress = total === 0 ? 0 : Math.round((checked / total) * 100);
    return { total, checked, totalPrice, progress };
  }, [grocery]);

  const sortedItems = useMemo(() => sortItems(grocery), [grocery]);

  const allChecked = totals.total > 0 && totals.checked === totals.total;

  const handleDelete = async (item: GroceryItem) => {
    const ok = window.confirm(
      `Supprimer "${item.item}" de la liste de courses ?`
    );
    if (!ok) return;
    await deleteGrocery(item.id);
    toast.success("Article supprimé", { description: item.item });
  };

  const handleCopy = async () => {
    if (grocery.length === 0) return;
    const lines = grocery.map(
      (g) =>
        `${g.checked ? "[x]" : "[ ]"} ${g.item} — ${g.qty} (${g.store})`
    );
    const text =
      `🛒 Liste de courses FrigoAi\n${lines.join("\n")}\n\nTotal estimé : ${formatEuro(
        totals.totalPrice
      )}`;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        toast.success("📋 Liste copiée", {
          description: `${totals.total} article${totals.total > 1 ? "s" : ""} · ${formatEuro(
            totals.totalPrice
          )}`,
        });
      } else {
        toast.error("Presse-papier indisponible sur cet appareil");
      }
    } catch {
      toast.error("Impossible de copier la liste");
    }
  };

  const handleRegenerate = async () => {
    const ok = await generatePlan();
    if (ok) {
      toast.success("🔄 Liste régénérée", {
        description: "Nouvelle liste déduite du plan de repas",
      });
    } else {
      toast.error("Échec de la régénération");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-4">
      {/* ---------- Completed banner ---------- */}
      <AnimatePresence initial={false}>
        {allChecked && (
          <motion.div
            key="completed-banner"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="glass-panel-emerald rounded-2xl p-3 flex items-center gap-3">
              <span className="text-2xl shrink-0" aria-hidden>
                🎉
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-white text-sm leading-tight">
                  Toutes vos courses sont dans le panier !
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Total estimé :{" "}
                  <span className="font-semibold text-[#00C16E]">
                    {formatEuro(totals.totalPrice)}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Header card ---------- */}
      <header className="glass-panel rounded-3xl p-5 space-y-4">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00C16E] glass-panel-emerald rounded-full px-2.5 py-1">
          🛒 Liste de courses auto-générée
        </span>

        {/* Title */}
        <div>
          <h2 className="font-display font-black text-2xl text-white leading-tight">
            Mes Courses
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Déduite automatiquement de votre plan de repas anti-gaspi.
          </p>
        </div>

        {/* Progress + counts */}
        <div className="space-y-2">
          <Progress
            value={totals.progress}
            className="h-2 bg-white/10"
            aria-label={`Progression : ${totals.checked} sur ${totals.total} articles`}
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-300">
              <span className="font-bold text-white">{totals.checked}</span>
              <span className="text-gray-500"> / {totals.total}</span>
              <span className="text-gray-400"> articles</span>
            </span>
            <span className="text-gray-300 flex items-center gap-1">
              <span className="text-gray-500">≈</span>
              <span className="font-bold text-white">
                {formatEuro(totals.totalPrice)}
              </span>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            disabled={grocery.length === 0}
            className="tap glass-pill rounded-xl h-10 flex items-center justify-center gap-1.5 text-xs font-semibold text-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <Copy className="w-3.5 h-3.5" /> Copier la liste
          </button>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="tap glass-panel-emerald rounded-xl h-10 flex items-center justify-center gap-1.5 text-xs font-semibold text-white disabled:opacity-60 disabled:pointer-events-none"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {generating ? "Régénération…" : "Régénérer"}
          </button>
        </div>
      </header>

      {/* ---------- Add item form ---------- */}
      <AddItemForm disabled={loadingGrocery} />

      {/* ---------- Content ---------- */}
      {loadingGrocery ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <GroceryRowSkeleton key={i} />
          ))}
        </div>
      ) : grocery.length === 0 ? (
        <EmptyState onGenerate={handleRegenerate} />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {sortedItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  duration: 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <GroceryRow
                  item={item}
                  onToggle={(next) => toggleGrocery(item.id, next)}
                  onDelete={() => handleDelete(item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ---------- Footer hint ---------- */}
      {!loadingGrocery && grocery.length > 0 && (
        <p className="text-center text-[10px] text-gray-600 mt-2 flex items-center justify-center gap-1">
          <ShoppingCart className="w-3 h-3" /> Cochez les articles au fur et à
          mesure de vos courses
        </p>
      )}
    </div>
  );
}
