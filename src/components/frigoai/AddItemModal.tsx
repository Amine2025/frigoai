"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { emojiFor, daysUntil } from "@/lib/fridge-utils";
import type { FridgeCategory } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: FridgeCategory[] = [
  "Fruits",
  "Légumes",
  "Produits laitiers",
  "Viandes & Poissons",
  "Féculents",
  "Surgelés",
  "Boissons",
  "Autre",
];

const UNITS = [
  "pièce",
  "g",
  "kg",
  "L",
  "ml",
  "boîte",
  "tranche",
  "paquet",
  "pot",
];

const QUICK_DAYS: { label: string; days: number }[] = [
  { label: "+1j", days: 1 },
  { label: "+3j", days: 3 },
  { label: "+7j", days: 7 },
];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToISO(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).toISOString();
}

function addDaysDate(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                      */
/* ------------------------------------------------------------------ */

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export function AddItemModal() {
  const isOpen = useFrigoStore((s) => s.isAddItemOpen);
  const setOpen = useFrigoStore((s) => s.setAddItemOpen);
  const addItem = useFrigoStore((s) => s.addItem);

  const todayPlus3 = useMemo(() => toDateInput(addDaysDate(3)), []);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<FridgeCategory>("Autre");
  const [quantity, setQuantity] = useState<string>("1");
  const [unit, setUnit] = useState<string>("pièce");
  const [expirationDate, setExpirationDate] = useState<string>(todayPlus3);
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever modal closes (after exit animation)
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setName("");
      setCategory("Autre");
      setQuantity("1");
      setUnit("pièce");
      setExpirationDate(toDateInput(addDaysDate(3)));
      setSubmitting(false);
    }, 250);
    return () => clearTimeout(t);
  }, [isOpen]);

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

  const previewEmoji = useMemo(
    () => (name.trim() ? emojiFor(name, category) : "📦"),
    [name, category]
  );

  const expDaysLeft = useMemo(() => {
    if (!expirationDate) return null;
    return daysUntil(dateInputToISO(expirationDate));
  }, [expirationDate]);

  const nameError = name.trim().length === 0;
  const dateError = !expirationDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) {
      toast.error("Le nom du produit est obligatoire.");
      return;
    }
    if (dateError) {
      toast.error("Veuillez sélectionner une date d'expiration.");
      return;
    }

    const qty = parseFloat(quantity.replace(",", "."));
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;

    setSubmitting(true);
    const ok = await addItem({
      name: name.trim(),
      category,
      quantity: safeQty,
      unit,
      expirationDate: dateInputToISO(expirationDate),
      emoji: previewEmoji,
    });

    if (ok) {
      toast.success("✓ Produit ajouté au frigo", {
        description: `${previewEmoji} ${name.trim()} · ${safeQty} ${unit}`,
      });
      setOpen(false);
    } else {
      toast.error("Impossible d'ajouter le produit. Réessayez.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="add-item-overlay"
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un produit au frigo"
        >
          {/* Backdrop */}
          <button
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="relative w-full max-w-md glass-strong rounded-t-3xl border border-border shadow-2xl pb-[max(env(safe-area-inset-bottom),16px)] max-h-[92dvh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <header className="px-5 pt-2 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-9 h-9 rounded-2xl glass-panel-emerald flex items-center justify-center text-xl"
                  aria-hidden
                >
                  {previewEmoji}
                </span>
                <div>
                  <h2 className="font-display font-bold text-foreground text-base leading-none">
                    Nouveau produit
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ajoutez-le pour suivre sa fraîcheur
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="tap w-8 h-8 rounded-xl glass-pill flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Body (scrollable) */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto slim-scroll px-5 pt-1 pb-3 space-y-4"
            >
              {/* Name */}
              <Field label="Nom du produit" htmlFor="add-item-name">
                <div className="relative">
                  <input
                    id="add-item-name"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="ex. Pomme, Lait, Saumon…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(
                      "w-full h-11 rounded-2xl glass-pill px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all",
                      nameError
                        ? "ring-1 ring-red-500/50 focus:ring-red-500"
                        : "focus:ring-1 focus:ring-[#00C16E]/60"
                    )}
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none"
                    aria-hidden
                  >
                    {previewEmoji}
                  </span>
                </div>
              </Field>

              {/* Category */}
              <Field label="Catégorie" htmlFor="add-item-category">
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as FridgeCategory)}
                >
                  <SelectTrigger
                    id="add-item-category"
                    className="w-full h-11 rounded-2xl glass-pill border-border text-sm text-foreground data-[placeholder]:text-muted-foreground"
                  >
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {emojiFor("", c)}&nbsp;&nbsp;{c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantité" htmlFor="add-item-qty">
                  <input
                    id="add-item-qty"
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full h-11 rounded-2xl glass-pill px-4 text-sm text-foreground outline-none focus:ring-1 focus:ring-[#00C16E]/60"
                  />
                </Field>
                <Field label="Unité" htmlFor="add-item-unit">
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger
                      id="add-item-unit"
                      className="w-full h-11 rounded-2xl glass-pill border-border text-sm text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Expiration date */}
              <Field
                label="Date d'expiration"
                htmlFor="add-item-date"
                hint={
                  expDaysLeft === null
                    ? undefined
                    : expDaysLeft < 0
                    ? `⚠️ Ce produit est déjà périmé depuis ${Math.abs(
                        expDaysLeft
                      )}j`
                    : expDaysLeft === 0
                    ? "Expire aujourd'hui"
                    : `Expire dans ${expDaysLeft}j`
                }
              >
                <div className="relative">
                  <input
                    id="add-item-date"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className={cn(
                      "w-full h-11 rounded-2xl glass-pill px-4 pr-10 text-sm text-foreground outline-none transition-all [color-scheme:dark]",
                      dateError
                        ? "ring-1 ring-red-500/50"
                        : "focus:ring-1 focus:ring-[#00C16E]/60"
                    )}
                  />
                  <CalendarClock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                {/* Quick buttons */}
                <div className="flex gap-2 mt-2">
                  {QUICK_DAYS.map(({ label, days }) => {
                    const target = toDateInput(addDaysDate(days));
                    const active = expirationDate === target;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setExpirationDate(target)}
                        className={cn(
                          "tap flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border",
                          active
                            ? "glass-panel-emerald text-foreground border-[#00C16E]/40"
                            : "glass-pill text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        {active && <Check className="w-3 h-3" strokeWidth={3} />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "tap w-full h-12 rounded-2xl glass-panel-emerald text-foreground font-bold text-sm flex items-center justify-center gap-2 mt-2",
                  submitting && "opacity-70 pointer-events-none"
                )}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Ajout en cours…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    Ajouter au frigo
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
