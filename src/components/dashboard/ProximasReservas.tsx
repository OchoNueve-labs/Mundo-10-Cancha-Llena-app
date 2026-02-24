"use client";

import { Clock, User } from "lucide-react";
import { cn, getWhatsAppLink } from "@/lib/utils";
import { ESTADO_RESERVA_COLORS } from "@/lib/constants";
import type { Reserva } from "@/lib/types";

interface ProximasReservasProps {
  reservas: Reserva[];
  loading: boolean;
}

const SHORT_MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFechaCorta(fecha: string): string {
  const [, m, d] = fecha.split("-");
  return `${parseInt(d)} ${SHORT_MONTHS[parseInt(m) - 1]}`;
}

function isToday(fecha: string): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return fecha === today;
}

export function ProximasReservas({ reservas, loading }: ProximasReservasProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Sin reservas proximas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reservas.map((reserva) => (
        <div
          key={reserva.id}
          className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3"
        >
          <div className="flex h-10 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-sm font-bold">
            <span>{reserva.hora?.substring(0, 5) || "—"}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {isToday(reserva.fecha) ? "hoy" : formatFechaCorta(reserva.fecha)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {reserva.nombre_cliente || "Sin nombre"}
              </p>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                  ESTADO_RESERVA_COLORS[reserva.estado] ||
                    "bg-muted text-muted-foreground border-border"
                )}
              >
                {reserva.estado}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {reserva.centro} — {reserva.tipo_cancha} {reserva.cancha}
            </p>
          </div>
          {reserva.telefono_cliente && (
            <a
              href={getWhatsAppLink(reserva.telefono_cliente)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
              title="WhatsApp"
            >
              <User className="h-4 w-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
