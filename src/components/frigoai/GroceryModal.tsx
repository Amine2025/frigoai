"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  X,
  Trash2,
  Clipboard,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { GroceryItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function GroceryRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3 transition-opacity",
        item.checked && "opacity-50"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Checkbox
          checked={item.checked}
          onCheckedChange={(v) => onToggle(v === true)}
          aria-label={`Marquer ${item.item} comme ${item.checked ? "à acheter" : "acheté"}`}
          className="border-white/30 data-[state=checked]:bg-[#00C16E] data-[state=checked]:border-[#00C16E] data-[state=checked]:text-black"
        />
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold text-white text-sm truncate",
              item.checked && "line-through"
            )}
          >
            {item.item}
          </p>
          <p className="text-[10px] text-gray-400 truncate">{item.store}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[#00C16E] font-bold text-xs whitespace-nowrap">
          {item.qty}
        </span>
        <button
          onClick={onDelete}
          aria-label={`Supprimer ${item.item}`}
          className="tap w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export function GroceryModal() {
  const isOpen = useFrigoStore((s) => s.isGroceryModalOpen);
  const setOpen = useFrigoStore((s) => s.setGroceryModalOpen);
  const grocery = useFrigoStore((s) => s.grocery);
  const toggleGrocery = useFrigoStore((s) => s.toggleGrocery);
  const deleteGrocery = useFrigoStore((s) => s.deleteGrocery);
  const addGrocery = useFrigoStore((s) => s.addGrocery);

  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [adding, setAdding] = useState(false);
  const [copying, setCopying] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setOpen]);

  // Reset form after close (post-exit)
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setNewItem("");
      setNewQty("1");
      setAdding(false);
      setCopying(false);
    }, 250);
    return () => clearTimeout(t);
  }, [isOpen]);

  const totalCount = grocery.length;
  const totalPrice = useMemo(
    () => grocery.reduce((sum, g) => sum + (g.estimatedPrice ?? 0), 0),
    [grocery]
  );
  const remainingCount = grocery.filter((g) => !g.checked).length;

  const handleCopy = async () => {
    setCopying(true);
    const lines = grocery.map(
      (g) => `${g.checked ? "[x]" : "[ ]"} ${g.item} — ${g.qty}`
    );
    const text = `🛒 Liste de courses FrigoAi\n${lines.join("\n")}\n\nTotal estimé : ${totalPrice.toFixed(2)} €`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success("📋 Liste copiée", {
          description: `${totalCount} article${totalCount > 1 ? "s" : ""} · ${totalPrice.toFixed(2)} €`,
        });
        setOpen(false);
      } else {
        toast.error("Presse-papier indisponible sur cet appareil");
      }
    } catch {
      toast.error("Impossible de copier la liste");
    } finally {
      setCopying(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) {
      toast.error("Saisissez un nom d'article");
      return;
    }
    setAdding(true);
    const ok = await addGrocery({
      item: name,
      qty: newQty.trim() || "1",
      store: "Supermarché",
    });
    if (ok) {
      toast.success("✓ Article ajouté", {
        description: `${name} — ${newQty.trim() || "1"}`,
      });
      setNewItem("");
      setNewQty("1");
    } else {
      toast.error("Impossible d'ajouter l'article");
    }
    setAdding(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="grocery-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Liste de courses résiduelle"
        >
          {/* Backdrop click target */}
          <button
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="relative w-full max-w-lg max-h-[88dvh] flex flex-col glass-panel rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl glass-panel-emerald flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-[#00C16E]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-white text-base leading-tight">
                    Liste de Courses Résiduelle
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {totalCount > 0
                      ? `${remainingCount} restant${remainingCount > 1 ? "s" : ""} · ${totalPrice.toFixed(2)} €`
                      : "Tout est dans votre frigo"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="tap shrink-0 w-8 h-8 rounded-xl glass-pill flex items-center justify-center text-gray-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto slim-scroll px-5 py-4 space-y-4">
              {totalCount === 0 ? (
                <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center">
                  <span className="text-4xl mb-2" aria-hidden>
                    🎉
                  </span>
                  <p className="text-sm text-gray-300">
                    Aucun article manquant — votre frigo suffit pour tous les
                    repas ! 🎉
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Seulement{" "}
                    <span className="font-bold text-[#00C16E]">
                      {totalCount}
                    </span>{" "}
                    petits articles de fond de placard manquent pour réaliser
                    tous les 21 repas de la semaine ! Vos courses vous coûteront
                    moins de{" "}
                    <span className="font-bold text-white">
                      {totalPrice.toFixed(2)} €
                    </span>
                    .
                  </p>

                  <ul className="space-y-2">
                    {grocery.map((g) => (
                      <GroceryRow
                        key={g.id}
                        item={g}
                        onToggle={(checked) => toggleGrocery(g.id, checked)}
                        onDelete={() => deleteGrocery(g.id)}
                      />
                    ))}
                  </ul>
                </>
              )}

              {/* Add form */}
              <form
                onSubmit={handleAdd}
                className="glass-pill rounded-2xl p-3 space-y-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Ajouter un article
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="ex. Huile d'olive, riz…"
                    className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-[#00C16E]/60"
                  />
                  <input
                    type="text"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="Qté"
                    className="w-16 h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-[#00C16E]/60 text-center"
                  />
                  <button
                    type="submit"
                    disabled={adding}
                    aria-label="Ajouter l'article"
                    className="tap shrink-0 w-10 h-10 rounded-xl glass-panel-emerald flex items-center justify-center text-white disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {adding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <footer className="px-5 py-4 border-t border-white/5 flex items-center gap-3 bg-black/20">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Total estimé
                </p>
                <p className="font-display font-black text-lg text-white">
                  {totalPrice.toFixed(2)} €
                </p>
              </div>
              <button
                onClick={handleCopy}
                disabled={copying || totalCount === 0}
                className="tap flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00C16E] text-black font-bold text-xs hover:bg-[#00C16E]/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                {copying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clipboard className="w-4 h-4" />
                )}
                <span>Copier la liste</span>
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
