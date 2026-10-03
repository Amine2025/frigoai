"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Euro,
  Snowflake,
  AlertTriangle,
  UtensilsCrossed,
  Flame,
  RefreshCw,
  RotateCcw,
  Share2,
  Loader2,
  Leaf,
  Mail,
  Phone,
  LogOut,
} from "lucide-react";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/fridge-utils";
import type { FridgeCategory } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatEuro(value: number): string {
  return (
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function formatInt(value: number): string {
  return value.toLocaleString("fr-FR");
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MiniStatCard({
  icon,
  label,
  value,
  sub,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  iconClass?: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span
          className={cn(
            "w-7 h-7 rounded-lg glass-pill flex items-center justify-center text-gray-300",
            iconClass
          )}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display font-black text-xl text-white leading-none">
          {value}
        </span>
        {sub && (
          <span className="text-[10px] text-gray-500 leading-none">{sub}</span>
        )}
      </div>
    </div>
  );
}

function ImpactCard({
  emoji,
  title,
  value,
}: {
  emoji: string;
  title: string;
  value: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-3 flex flex-col gap-1 items-start">
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none" aria-hidden>
          {emoji}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {title}
        </span>
      </div>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
    </div>
  );
}

function CategoryRow({
  emoji,
  label,
  count,
  total,
  color,
  index,
}: {
  emoji: string;
  label: string;
  count: number;
  total: number;
  color: string;
  index: number;
}) {
  const pct = total === 0 ? 0 : Math.max(2, Math.round((count / total) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="space-y-1.5"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="text-base leading-none" aria-hidden>
          {emoji}
        </span>
        <span className="flex-1 truncate text-gray-200 font-medium">
          {label}
        </span>
        <span className="text-gray-400 tabular-nums">
          {count}
          <span className="text-gray-600 text-[10px] ml-0.5">
            · {Math.round((count / total) * 100)}%
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: 0.6,
            delay: 0.1 + Math.min(index * 0.05, 0.4),
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export function ProfilScreen() {
  const stats = useFrigoStore((s) => s.stats);
  const fridge = useFrigoStore((s) => s.fridge);
  const plan = useFrigoStore((s) => s.plan);
  const refreshAll = useFrigoStore((s) => s.refreshAll);
  const seedDemo = useFrigoStore((s) => s.seedDemo);
  const user = useFrigoStore((s) => s.user);
  const logout = useFrigoStore((s) => s.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /* ---------- User display ---------- */
  const displayName = user?.name?.trim() || "Chef Anti-Gaspi";
  const displayEmail = user?.email ?? "";
  const displayPhone = user?.phone ?? "";

  /* ---------- Defensive derived stats ---------- */
  const totalItems = stats?.totalItems ?? fridge.length;
  const expiringSoon = stats?.expiringSoon ?? 0;
  const totalCalories = stats?.totalCaloriesPlanned ?? 0;
  const wasteSavedPercent = stats?.wasteSavedPercent ?? 0;
  const estimatedSavings = stats?.estimatedSavings ?? 0;

  // Planned meals (3 per day in the plan, capped at 21)
  const plannedMeals = plan.length === 0 ? 0 : plan.length * 3;

  // Estimated environmental impact
  const estimatedCO2 = Math.max(0, Math.round(estimatedSavings * 0.9));
  const estimatedWater = Math.max(0, Math.round(estimatedSavings * 50));

  /* ---------- Frigo breakdown by category ---------- */
  const categories = useMemo(() => {
    const counts = new Map<FridgeCategory, number>();
    for (const item of fridge) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([cat, count]) => ({
        cat,
        count,
        meta: CATEGORY_META[cat] ?? CATEGORY_META.Autre,
      }))
      .sort((a, b) => b.count - a.count);
  }, [fridge]);

  const totalForBars = fridge.length || 1;

  /* ---------- Actions ---------- */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      toast.success("✓ Données rafraîchies", {
        description: "Frigo, planning, courses et statistiques synchronisés",
      });
    } catch {
      toast.error("Échec du rafraîchissement");
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    const ok = window.confirm(
      "Réinitialiser toutes les données avec les produits démo ? Vos modifications seront perdues."
    );
    if (!ok) return;
    setResetting(true);
    try {
      const success = await seedDemo();
      if (success) {
        toast.success("✓ Données démo restaurées", {
          description: "Le frigo a été réinitialisé avec succès",
        });
      } else {
        toast.error("Échec de la réinitialisation");
      }
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = async () => {
    const ok = window.confirm("Se déconnecter de FrigoAi ?");
    if (!ok) return;
    setLoggingOut(true);
    try {
      await logout();
      toast.success("À bientôt 👋", {
        description: "Vous êtes déconnecté",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleShare = async () => {
    const lines = [
      "🌱 FrigoAi — Mon impact anti-gaspi",
      `• ${wasteSavedPercent}% de gaspillage évité cette semaine`,
      `• ≈ ${formatEuro(estimatedSavings)} économisés`,
      `• ${totalItems} produits au frigo`,
      `• ${plannedMeals} repas planifiés · ${formatInt(totalCalories)} kcal`,
      `• ~${formatInt(estimatedCO2)} kg de CO₂ évités · ~${formatInt(
        estimatedWater
      )} L d'eau économisés`,
    ];
    const text = lines.join("\n");
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        toast.success("Partagé !", {
          description: "Résumé copié dans le presse-papier",
        });
      } else {
        toast.error("Presse-papier indisponible sur cet appareil");
      }
    } catch {
      toast.error("Impossible de copier le résumé");
    }
  };

  /* ---------- Render ---------- */
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-5"
    >
      {/* ---------- Hero card ---------- */}
      <motion.section
        variants={itemVariants}
        aria-label="Résumé de la semaine"
        className="relative overflow-hidden glass-panel-emerald rounded-3xl p-6"
      >
        {/* radial emerald glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full bg-[#00C16E]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-[#00C16E]/15 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00C16E] to-[#009056] flex items-center justify-center shadow-lg shadow-[#00C16E]/30">
            <Leaf className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-300">Bonjour 👋</p>
            <h2 className="font-display font-black text-2xl text-white leading-tight truncate">
              {displayName}
            </h2>
          </div>
        </div>

        {/* User account info (email + phone) */}
        <div className="relative mt-3 space-y-1.5">
          {displayEmail && (
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Mail className="w-3.5 h-3.5 text-[#00C16E]" />
              <span className="truncate">{displayEmail}</span>
            </div>
          )}
          {displayPhone && (
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Phone className="w-3.5 h-3.5 text-[#00C16E]" />
              <span>{displayPhone}</span>
            </div>
          )}
        </div>

        <div className="relative mt-5">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-black text-gradient-emerald leading-none">
              {wasteSavedPercent}
            </span>
            <span className="text-2xl font-black text-gradient-emerald leading-none pb-1">
              %
            </span>
          </div>
          <p className="text-xs text-gray-300 mt-2">
            de gaspillage évité cette semaine
          </p>
        </div>

        <div className="relative mt-3 inline-flex items-center gap-1.5 text-[#00C16E] text-sm font-semibold">
          <Euro className="w-4 h-4" />
          <span>≈ {formatEuro(estimatedSavings)} économisés</span>
        </div>
      </motion.section>

      {/* ---------- Stats grid ---------- */}
      <motion.section
        variants={itemVariants}
        aria-label="Statistiques détaillées"
        className="grid grid-cols-2 gap-3"
      >
        <MiniStatCard
          icon={<Snowflake className="w-3.5 h-3.5" />}
          label="Produits au frigo"
          value={formatInt(totalItems)}
        />
        <MiniStatCard
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="À consommer vite"
          value={formatInt(expiringSoon)}
          sub="≤ 3 jours"
          iconClass="text-amber-300"
        />
        <MiniStatCard
          icon={<UtensilsCrossed className="w-3.5 h-3.5" />}
          label="Repas planifiés"
          value={formatInt(plannedMeals)}
        />
        <MiniStatCard
          icon={<Flame className="w-3.5 h-3.5" />}
          label="Calories planifiées"
          value={formatInt(totalCalories)}
          sub="kcal"
          iconClass="text-amber-300"
        />
      </motion.section>

      {/* ---------- Anti-gaspi impact ---------- */}
      <motion.section variants={itemVariants} className="space-y-3">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <span aria-hidden>🌱</span> Impact Anti-Gaspillage
        </h3>

        <div className="glass-panel rounded-2xl p-4 space-y-2">
          {/* Custom progress bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">Produits sauvés</span>
            <span className="font-bold text-white">
              {wasteSavedPercent}
              <span className="text-gray-400 font-medium">%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, wasteSavedPercent))}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-[#00C16E] to-[#00E58A]"
            />
          </div>
          <p className="text-[10px] text-gray-500">
            {wasteSavedPercent}% de vos produits sauvés du gaspillage
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <ImpactCard
            emoji="🌍"
            title="Planète"
            value={`~${formatInt(estimatedCO2)} kg CO₂`}
          />
          <ImpactCard
            emoji="💧"
            title="Eau"
            value={`~${formatInt(estimatedWater)} L`}
          />
          <ImpactCard
            emoji="💰"
            title="Wallet"
            value={formatEuro(estimatedSavings)}
          />
        </div>
      </motion.section>

      {/* ---------- Frigo breakdown ---------- */}
      {categories.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-3">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <span aria-hidden>📊</span> Répartition du frigo
          </h3>

          <div className="glass-panel rounded-2xl p-4 space-y-3">
            {categories.map((c, i) => (
              <CategoryRow
                key={c.cat}
                emoji={c.meta.emoji}
                label={c.meta.label}
                count={c.count}
                total={totalForBars}
                color={c.meta.color}
                index={i}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* ---------- Actions ---------- */}
      <motion.section variants={itemVariants} className="space-y-2.5">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <span aria-hidden>⚙️</span> Actions
        </h3>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="tap w-full glass-pill rounded-2xl h-12 flex items-center justify-center gap-2 text-sm font-semibold text-white disabled:opacity-60 disabled:pointer-events-none"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {refreshing ? "Rafraîchissement…" : "Rafraîchir les données"}
        </button>

        <button
          onClick={handleShare}
          className="tap w-full glass-panel-emerald rounded-2xl h-12 flex items-center justify-center gap-2 text-sm font-semibold text-white"
        >
          <Share2 className="w-4 h-4" />
          Partager FrigoAi
        </button>

        <button
          onClick={handleReset}
          disabled={resetting}
          className="tap w-full rounded-2xl h-10 flex items-center justify-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-60 disabled:pointer-events-none"
        >
          {resetting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          {resetting ? "Réinitialisation…" : "Réinitialiser les données démo"}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="tap w-full rounded-2xl h-10 flex items-center justify-center gap-2 text-xs font-semibold text-red-300/90 hover:text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:pointer-events-none"
        >
          {loggingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          {loggingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </motion.section>

      {/* ---------- Footer ---------- */}
      <motion.footer variants={itemVariants} className="pt-2 text-center space-y-1">
        <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#00C16E]/60" />
          FrigoAi · IA au service de l&apos;anti-gaspillage alimentaire
        </p>
        <p className="text-[9px] text-gray-600 tracking-wider uppercase">
          v1.0
        </p>
      </motion.footer>
    </motion.div>
  );
}
