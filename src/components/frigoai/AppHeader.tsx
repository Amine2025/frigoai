"use client";

import { useFrigoStore } from "@/store/frigo-store";
import { Sparkles, Bell } from "lucide-react";

export function AppHeader() {
  const stats = useFrigoStore((s) => s.stats);
  const fridge = useFrigoStore((s) => s.fridge);

  const urgent = fridge.filter((f) => {
    const d = Math.round(
      (new Date(f.expirationDate).getTime() - Date.now()) / 86400000
    );
    return d <= 2;
  }).length;

  return (
    <header className="safe-top sticky top-0 z-30">
      <div className="mx-auto max-w-md px-4 pt-3 pb-2">
        <div className="glass-panel rounded-3xl border border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#00C16E] to-[#0d7a4a] flex items-center justify-center shadow-lg shadow-[#00C16E]/30">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00C16E] border-2 border-[#0a0f0d] animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-black text-base text-white leading-none">
                Frigo<span className="text-gradient-emerald">Ai</span>
              </h1>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Anti-gaspillage · 7 jours
              </p>
            </div>
          </div>
          <button
            className="tap relative w-9 h-9 rounded-2xl glass-pill border border-white/10 flex items-center justify-center text-gray-300 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {urgent > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#00C16E] text-black text-[9px] font-bold flex items-center justify-center">
                {urgent}
              </span>
            )}
          </button>
        </div>
        {stats && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 px-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C16E]" />
              {stats.totalItems} produits
            </span>
            <span className="text-gray-600">·</span>
            <span>{stats.wasteSavedPercent}% anti-gaspi</span>
            <span className="text-gray-600">·</span>
            <span className="text-[#00C16E] font-semibold">
              {stats.estimatedSavings}€ économisés
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
