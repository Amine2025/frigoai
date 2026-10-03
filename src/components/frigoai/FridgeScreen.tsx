"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, RotateCcw, Trash2, Snowflake, CheckCircle2, ScanLine } from "lucide-react";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  daysUntil,
  freshness,
  type Freshness,
} from "@/lib/fridge-utils";
import type { FridgeItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type FreshnessBadge = {
  label: string;
  cls: string;
  glow: boolean;
};

function freshnessBadge(f: Freshness): FreshnessBadge {
  if (f.level === "expired") {
    return {
      label: "Périmé",
      cls: "bg-red-500/90 text-white border-red-300/30",
      glow: false,
    };
  }
  if (f.level === "urgent") {
    return {
      label: f.label,
      cls: "bg-orange-500/90 text-white border-orange-300/30",
      glow: true,
    };
  }
  if (f.level === "soon" || f.level === "ok") {
    return {
      label: f.label,
      cls: "bg-yellow-400/90 text-black border-yellow-200/30",
      glow: false,
    };
  }
  return {
    label: f.label,
    cls: "bg-[#00C16E]/90 text-black border-[#00C16E]/40",
    glow: false,
  };
}

interface ItemGroup {
  key: "urgent" | "soon" | "fresh";
  label: string;
  emoji: string;
  items: FridgeItem[];
}

function groupItems(items: FridgeItem[]): ItemGroup[] {
  const urgent: FridgeItem[] = [];
  const soon: FridgeItem[] = [];
  const fresh: FridgeItem[] = [];

  for (const item of items) {
    const d = daysUntil(item.expirationDate);
    if (d <= 2) urgent.push(item);
    else if (d <= 7) soon.push(item);
    else fresh.push(item);
  }

  const sortByExpiration = (a: FridgeItem, b: FridgeItem) =>
    new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();

  urgent.sort(sortByExpiration);
  soon.sort(sortByExpiration);
  fresh.sort(sortByExpiration);

  return [
    { key: "urgent", label: "Urgent", emoji: "⚠️", items: urgent },
    { key: "soon", label: "Cette semaine", emoji: "📅", items: soon },
    { key: "fresh", label: "Frais", emoji: "✅", items: fresh },
  ].filter((g) => g.items.length > 0) as ItemGroup[];
}

/* ------------------------------------------------------------------ */
/*  Skeleton + Empty state                                             */
/* ------------------------------------------------------------------ */

function FridgeCardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-3 flex items-center gap-3">
      <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

function EmptyState({ onSeed }: { onSeed: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel rounded-3xl px-6 py-12 flex flex-col items-center text-center mt-6"
    >
      <div className="w-24 h-24 rounded-full glass-panel-emerald flex items-center justify-center text-5xl mb-5 shadow-lg shadow-[#00C16E]/20">
        🧊
      </div>
      <h3 className="font-display font-bold text-white text-lg">Votre frigo est vide</h3>
      <p className="text-sm text-gray-400 mt-1.5 mb-5 max-w-[260px]">
        Ajoutez vos produits pour suivre leur fraîcheur et générer un planning anti-gaspi.
      </p>
      <button
        onClick={onSeed}
        className="tap glass-panel-emerald rounded-full px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Charger des produits démo
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item card                                                          */
/* ------------------------------------------------------------------ */

function FridgeItemCard({
  item,
  index,
  onDelete,
}: {
  item: FridgeItem;
  index: number;
  onDelete: (id: string, name: string) => void;
}) {
  const f = freshness(item.expirationDate);
  const badge = freshnessBadge(f);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "glass-panel rounded-2xl p-3 flex items-center gap-3",
        f.level === "expired" && "ring-1 ring-red-500/30"
      )}
    >
      {/* Emoji square */}
      <div className="relative w-14 h-14 rounded-2xl glass-pill flex items-center justify-center text-3xl shrink-0">
        <span aria-hidden>{item.emoji}</span>
        {item.usedInPlan && (
          <span
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#00C16E] border-2 border-[#0a0f0d] flex items-center justify-center"
            title="Planifié dans le menu"
          >
            <CheckCircle2 className="w-3 h-3 text-black" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-white text-sm truncate">
            {item.name}
          </h4>
          {item.usedInPlan && (
            <span className="shrink-0 text-[9px] font-bold text-[#00C16E] bg-[#00C16E]/15 border border-[#00C16E]/30 px-1.5 py-0.5 rounded-full">
              Planifié
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
          {item.category}
        </p>
        <p className="text-xs text-gray-300 mt-1">
          {item.quantity}
          <span className="text-gray-400"> {item.unit}</span>
        </p>
      </div>

      {/* Right: badge + delete */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span
          className={cn(
            "tap inline-flex items-center justify-center text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap",
            badge.cls,
            badge.glow && "glow-urgent"
          )}
          title={`Expire le ${new Date(item.expirationDate).toLocaleDateString("fr-FR")}`}
        >
          {badge.label}
        </span>
        <button
          onClick={() => onDelete(item.id, item.name)}
          aria-label={`Supprimer ${item.name}`}
          className="tap w-7 h-7 rounded-xl glass-pill flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-400/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export function FridgeScreen() {
  const fridge = useFrigoStore((s) => s.fridge);
  const loadingFridge = useFrigoStore((s) => s.loadingFridge);
  const deleteItem = useFrigoStore((s) => s.deleteItem);
  const setAddItemOpen = useFrigoStore((s) => s.setAddItemOpen);
  const setScanModalOpen = useFrigoStore((s) => s.setScanModalOpen);
  const refreshAll = useFrigoStore((s) => s.refreshAll);
  const seedDemo = useFrigoStore((s) => s.seedDemo);

  const counts = useMemo(() => {
    let urgent = 0;
    let soon = 0;
    let fresh = 0;
    for (const item of fridge) {
      const d = daysUntil(item.expirationDate);
      if (d <= 2) urgent += 1;
      else if (d <= 7) soon += 1;
      else fresh += 1;
    }
    return { urgent, soon, fresh };
  }, [fridge]);

  const groups = useMemo(() => groupItems(fridge), [fridge]);

  const handleDelete = async (id: string, name: string) => {
    const ok = window.confirm(
      `Supprimer "${name}" du frigo ?`
    );
    if (!ok) return;
    const success = await deleteItem(id);
    if (success) {
      // lightweight re-sync (deleteItem already refreshes fridge + stats)
      void refreshAll;
    }
  };

  const handleSeed = async () => {
    await seedDemo();
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6">
      {/* ---------- Header ---------- */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-black text-2xl text-white leading-tight">
            Mon Frigo
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {fridge.length > 0
              ? `${fridge.length} produit${fridge.length > 1 ? "s" : ""} · trié par péremption`
              : "Suivez la fraîcheur de vos produits"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            aria-label="Réinitialiser avec des produits démo"
            className="tap glass-pill rounded-full h-9 w-9 flex items-center justify-center text-gray-300 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScanModalOpen(true)}
            className="tap glass-pill rounded-full h-9 px-3.5 flex items-center gap-1.5 text-sm font-semibold text-[#00C16E] border border-[#00C16E]/40 hover:bg-[#00C16E]/10"
            aria-label="Scanner le frigo avec la caméra"
          >
            <ScanLine className="w-4 h-4" strokeWidth={2.4} /> Scanner
          </button>
          <button
            onClick={() => setAddItemOpen(true)}
            className="tap glass-panel-emerald rounded-full h-9 px-4 flex items-center gap-1.5 text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Ajouter
          </button>
        </div>
      </header>

      {/* ---------- Stats bar ---------- */}
      <section
        aria-label="Statistiques de fraîcheur"
        className="glass-pill rounded-2xl mt-4 p-1.5 grid grid-cols-3 gap-1"
      >
        <StatPill
          label="À consommer"
          value={counts.urgent}
          dot="bg-red-500"
          textAccent={counts.urgent > 0 ? "text-red-300" : "text-gray-300"}
        />
        <StatPill
          label="Bientôt"
          value={counts.soon}
          dot="bg-yellow-400"
          textAccent={counts.soon > 0 ? "text-yellow-200" : "text-gray-300"}
        />
        <StatPill
          label="Frais"
          value={counts.fresh}
          dot="bg-[#00C16E]"
          textAccent={counts.fresh > 0 ? "text-[#00C16E]" : "text-gray-300"}
        />
      </section>

      {/* ---------- Content ---------- */}
      <div className="mt-5 space-y-4">
        {loadingFridge ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <FridgeCardSkeleton key={i} />
            ))}
          </div>
        ) : fridge.length === 0 ? (
          <EmptyState onSeed={handleSeed} />
        ) : (
          groups.map((group) => (
            <section key={group.key} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm" aria-hidden>
                  {group.emoji}
                </span>
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  {group.label}
                </h3>
                <span className="text-[10px] text-gray-500">
                  {group.items.length}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-2.5">
                {group.items.map((item, i) => (
                  <FridgeItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Footer hint */}
      {!loadingFridge && fridge.length > 0 && (
        <p className="text-center text-[10px] text-gray-600 mt-6 flex items-center justify-center gap-1">
          <Snowflake className="w-3 h-3" /> Maintenez votre frigo à jour pour un
          meilleur anti-gaspillage
        </p>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  dot,
  textAccent,
}: {
  label: string;
  value: number;
  dot: string;
  textAccent: string;
}) {
  return (
    <div className="rounded-xl px-3 py-2 flex flex-col items-center gap-0.5 bg-white/[0.02]">
      <div className="flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
        <span className={cn("font-display font-black text-lg leading-none", textAccent)}>
          {value}
        </span>
      </div>
      <span className="text-[9px] text-gray-400 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}
