"use client";

import { useFrigoStore } from "@/store/frigo-store";
import { Snowflake, ChefHat, CalendarDays, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "frigo" as const, label: "Frigo", icon: Snowflake },
  { key: "recipes" as const, label: "Recettes", icon: ChefHat },
  { key: "planning" as const, label: "Planning", icon: CalendarDays },
  { key: "courses" as const, label: "Courses", icon: ShoppingCart },
  { key: "profil" as const, label: "Profil", icon: User },
];

export function BottomNav() {
  const activeTab = useFrigoStore((s) => s.activeTab);
  const setActiveTab = useFrigoStore((s) => s.setActiveTab);
  const fridge = useFrigoStore((s) => s.fridge);
  const grocery = useFrigoStore((s) => s.grocery);

  const urgentCount = fridge.filter((f) => {
    const d = Math.round(
      (new Date(f.expirationDate).getTime() - Date.now()) / 86400000
    );
    return d <= 2;
  }).length;
  const groceryLeft = grocery.filter((g) => !g.checked).length;

  const badges: Record<string, number> = {
    frigo: urgentCount,
    recipes: urgentCount,
    courses: groceryLeft,
  };

  return (
    <footer className="sticky bottom-0 z-40 mt-auto safe-bottom">
      <div className="mx-auto max-w-md px-3 pb-2">
        <nav className="glass-strong rounded-3xl border border-border shadow-2xl px-2 py-2">
          <ul className="grid grid-cols-5 gap-1">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              const badge = badges[key] ?? 0;
              return (
                <li key={key}>
                  <button
                    onClick={() => setActiveTab(key)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "tap relative w-full flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-[10px] font-semibold transition-all",
                      active
                        ? "bg-[#00C16E]/15 text-[#00C16E]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="relative">
                      <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#00C16E] text-black text-[9px] font-bold flex items-center justify-center">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span>{label}</span>
                    {active && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#00C16E]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
