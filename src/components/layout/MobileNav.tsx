"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LayoutDashboard, CalendarDays, BookOpen, Bell, MessageSquare, Users, LogOut, HelpCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const ICON_MAP: Record<string, LucideIcon> = { LayoutDashboard, CalendarDays, BookOpen, Bell, MessageSquare, Users };

export function MobileNav({ alertCount }: { alertCount: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Image src="/logo-mundo10.jpg" alt="Mundo 10" width={140} height={36} className="h-8 w-auto" />
        <button onClick={() => setOpen(true)} className="p-2 text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {open && <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <div className={cn("fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-card transition-transform duration-200 ease-in-out lg:hidden", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Image src="/logo-mundo10.jpg" alt="Mundo 10" width={140} height={36} className="h-8 w-auto" />
          <button onClick={() => setOpen(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
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
          <Link href="/manual" onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", pathname === "/manual" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <HelpCircle className="h-4 w-4" /><span>Manual de Usuario</span>
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <LogOut className="h-4 w-4" /><span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
