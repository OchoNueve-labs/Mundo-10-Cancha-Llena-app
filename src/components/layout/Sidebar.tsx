"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, BookOpen, Bell, MessageSquare, Users, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const ICON_MAP: Record<string, LucideIcon> = { LayoutDashboard, CalendarDays, BookOpen, Bell, MessageSquare, Users };

export function Sidebar({ alertCount }: { alertCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <span className="text-xl">⚽</span>
        <div>
          <h2 className="text-sm font-bold text-foreground leading-tight">Cancha Llena</h2>
          <p className="text-[10px] text-muted-foreground">Mundo 10</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.icon === "Bell" && alertCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{alertCount > 99 ? "99+" : alertCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <LogOut className="h-4 w-4" /><span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
