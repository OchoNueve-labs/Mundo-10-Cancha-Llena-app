"use client";

import { Clock } from "lucide-react";
import type { HorarioMuerto } from "@/lib/types";

interface HorariosMuertosProps {
  horarios: HorarioMuerto[];
  loading: boolean;
}

export function HorariosMuertos({ horarios, loading }: HorariosMuertosProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (horarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Sin datos de horarios</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {horarios.map((h, i) => {
        const pct = h.total > 0 ? Math.round((h.libres / h.total) * 100) : 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-foreground">{h.hora}</span>
              <span className="text-muted-foreground">
                {h.libres}/{h.total} libres ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
