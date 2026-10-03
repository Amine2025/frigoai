"use client";

import { useEffect } from "react";
import { useFrigoStore } from "@/store/frigo-store";
import { AuthScreen } from "@/components/frigoai/AuthScreen";
import { AppHeader } from "@/components/frigoai/AppHeader";
import { BottomNav } from "@/components/frigoai/BottomNav";
import { FridgeScreen } from "@/components/frigoai/FridgeScreen";
import { RecipesScreen } from "@/components/frigoai/RecipesScreen";
import { PlanningScreen } from "@/components/frigoai/PlanningScreen";
import { CoursesScreen } from "@/components/frigoai/CoursesScreen";
import { ProfilScreen } from "@/components/frigoai/ProfilScreen";
import { AddItemModal } from "@/components/frigoai/AddItemModal";
import { ScanModal } from "@/components/frigoai/ScanModal";
import { Leaf } from "lucide-react";

export default function Home() {
  const activeTab = useFrigoStore((s) => s.activeTab);
  const user = useFrigoStore((s) => s.user);
  const authChecked = useFrigoStore((s) => s.authChecked);
  const fetchCurrentUser = useFrigoStore((s) => s.fetchCurrentUser);
  const refreshAll = useFrigoStore((s) => s.refreshAll);
  const refreshFridge = useFrigoStore((s) => s.refreshFridge);
  const seedDemo = useFrigoStore((s) => s.seedDemo);
  const fridge = useFrigoStore((s) => s.fridge);

  // On first mount: fetch current user (sets authChecked)
  useEffect(() => {
    if (!authChecked) {
      fetchCurrentUser();
    }
  }, [authChecked, fetchCurrentUser]);

  // Only when authenticated: load fridge (seed if empty), then refresh the rest
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/fridge", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await r.json();
        const items = data.items ?? [];
        if (items.length === 0) {
          await seedDemo();
        } else {
          await refreshAll();
        }
      } catch {
        if (!cancelled) await refreshAll();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, seedDemo, refreshAll]);

  /* ---------- Loading state while checking auth ---------- */
  if (!authChecked) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl glass-panel-emerald shadow-lg shadow-[#00C16E]/30 animate-pulse">
          <Leaf className="w-8 h-8 text-[#00C16E]" strokeWidth={2.5} />
        </div>
        <div className="text-center space-y-1">
          <p className="font-display font-bold text-white text-lg">
            Frigo<span className="text-[#00C16E]">Ai</span>
          </p>
          <p className="text-xs text-gray-400">Chargement…</p>
        </div>
      </div>
    );
  }

  /* ---------- Unauthenticated → AuthScreen ---------- */
  if (!user) {
    return <AuthScreen />;
  }

  /* ---------- Authenticated → main app ---------- */
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppHeader />

      <main className="flex-1 w-full">
        <div className="mx-auto max-w-md px-4 pt-2 pb-6">
          {activeTab === "frigo" && <FridgeScreen />}
          {activeTab === "recipes" && <RecipesScreen />}
          {activeTab === "planning" && <PlanningScreen />}
          {activeTab === "courses" && <CoursesScreen />}
          {activeTab === "profil" && <ProfilScreen />}
        </div>
      </main>

      {/* Global modal: add fridge item */}
      <AddItemModal />
      {/* Global modal: camera scan */}
      <ScanModal />

      <BottomNav />
    </div>
  );
}
