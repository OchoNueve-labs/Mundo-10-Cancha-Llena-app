"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { createClient } from "@/lib/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [alertCount, setAlertCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchAlertCount = async () => {
      const { count } = await supabase.from("alertas").select("*", { count: "exact", head: true }).eq("leida", false);
      setAlertCount(count || 0);
    };
    fetchAlertCount();

    const channel = supabase
      .channel("alert-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertas" }, () => setAlertCount((p) => p + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "alertas" }, () => fetchAlertCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    document.title = alertCount > 0 ? `(${alertCount}) Cancha Llena - Mundo 10` : "Cancha Llena - Mundo 10";
  }, [alertCount]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar alertCount={alertCount} />
      <MobileNav alertCount={alertCount} />
      <main className="lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
