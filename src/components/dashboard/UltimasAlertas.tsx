"use client";

import { Bell } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { ALERTA_TIPO_COLORS } from "@/lib/constants";
import type { Alerta } from "@/lib/types";

interface UltimasAlertasProps {
  alertas: Alerta[];
  loading: boolean;
}

export function UltimasAlertas({ alertas, loading }: UltimasAlertasProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Bell className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Sin alertas pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alertas.map((alerta) => (
        <div
          key={alerta.id}
          className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-3"
        >
          <span
            className={cn(
              "mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0",
              ALERTA_TIPO_COLORS[alerta.tipo] ||
                "bg-muted text-muted-foreground border-border"
            )}
          >
            {alerta.tipo?.replace(/_/g, " ")}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground line-clamp-2">
              {alerta.mensaje}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatRelative(alerta.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
