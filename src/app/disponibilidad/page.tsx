"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { cn, generateTimeSlots } from "@/lib/utils";
import { CENTROS, type CentroName, type TipoCancha } from "@/lib/constants";
import type { Slot } from "@/lib/types";
import {
  NuevaReservaDialog,
  type NuevaReservaInitial,
} from "@/components/reservas/NuevaReservaDialog";

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayStr() {
  return toLocalDateStr(new Date());
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

export default function DisponibilidadPage() {
  const supabase = createClient();

  // Filters
  const [fecha, setFecha] = useState(todayStr());
  const [centro, setCentro] = useState<CentroName>("Lo Prado");
  const [tipoCancha, setTipoCancha] = useState<TipoCancha>("Futbolito");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<NuevaReservaInitial>();

  // Data
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived: available tipos for selected centro
  const tiposDisponibles = useMemo(() => {
    return CENTROS[centro].canchas.map((c) => c.tipo);
  }, [centro]);

  // Reset tipoCancha when centro changes if current tipo not available
  useEffect(() => {
    if (!tiposDisponibles.includes(tipoCancha)) {
      setTipoCancha(tiposDisponibles[0]);
    }
  }, [centro, tiposDisponibles, tipoCancha]);

  // Derived: cancha config for current selection
  const canchaConfig = useMemo(() => {
    return CENTROS[centro].canchas.find((c) => c.tipo === tipoCancha);
  }, [centro, tipoCancha]);

  // Derived: time slots
  const timeSlots = useMemo(() => {
    if (!canchaConfig) return [];
    return generateTimeSlots(
      canchaConfig.horario.inicio,
      canchaConfig.horario.fin,
      canchaConfig.intervalo
    );
  }, [canchaConfig]);

  // Derived: cancha names
  const canchaNames = useMemo(() => {
    return canchaConfig?.nombres ?? [];
  }, [canchaConfig]);

  // Slot lookup map: key = "HH:MM|CanchaName"
  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const slot of slots) {
      const hora = slot.hora?.substring(0, 5) ?? "";
      const key = `${hora}|${slot.cancha}`;
      map.set(key, slot);
    }
    return map;
  }, [slots]);

  // Current hour for highlight
  const currentHour = useMemo(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, []);

  const isToday = fecha === todayStr();

  const fetchSlots = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("slots")
      .select("*")
      .eq("fecha", fecha)
      .eq("centro", centro)
      .eq("tipo_cancha", tipoCancha);

    if (!error) {
      setSlots((data as Slot[]) || []);
    }
    setLoading(false);
  }, [supabase, fecha, centro, tipoCancha]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Summary stats
  const totalSlots = timeSlots.length * canchaNames.length;
  const ocupados = useMemo(() => {
    let count = 0;
    for (const hora of timeSlots) {
      for (const cancha of canchaNames) {
        const slot = slotMap.get(`${hora}|${cancha}`);
        if (slot && slot.estado !== "disponible") count++;
      }
    }
    return count;
  }, [timeSlots, canchaNames, slotMap]);

  const porcentaje =
    totalSlots > 0 ? Math.round((ocupados / totalSlots) * 100) : 0;

  const handleCellClick = (hora: string, cancha: string) => {
    const slot = slotMap.get(`${hora}|${cancha}`);

    if (!slot || slot.estado === "disponible") {
      setDialogInitial({
        centro,
        tipo_cancha: tipoCancha,
        cancha,
        fecha,
        hora,
      });
      setDialogOpen(true);
    } else if (slot.estado === "reservado") {
      window.alert(
        `Reserva existente:\n\nCancha: ${cancha}\nHora: ${hora}\nFecha: ${fecha}\nCliente: ${slot.cliente_nombre || "Sin nombre"}\nTelefono: ${slot.cliente_telefono || "—"}\nReserva ID: ${slot.reserva_id || "—"}`
      );
    } else {
      window.alert(
        `Slot bloqueado:\n\nCancha: ${cancha}\nHora: ${hora}\nNotas: ${slot.notas || "Sin motivo especificado"}`
      );
    }
  };

  return (
    <AppShell>
      <NuevaReservaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={dialogInitial}
        onCreated={fetchSlots}
      />

      <Header
        title="Disponibilidad"
        description="Grilla de horarios por centro y cancha"
      >
        <button
          onClick={fetchSlots}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
        </button>
      </Header>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFecha(shiftDate(fecha, -1))}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => setFecha(shiftDate(fecha, 1))}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Dia siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setFecha(todayStr())}
              className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Centro select */}
        <select
          value={centro}
          onChange={(e) => setCentro(e.target.value as CentroName)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {(Object.keys(CENTROS) as CentroName[]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Tipo cancha select */}
        <select
          value={tipoCancha}
          onChange={(e) => setTipoCancha(e.target.value as TipoCancha)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {tiposDisponibles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg bg-card border border-border">
        <span className="text-sm text-foreground font-medium">
          {ocupados} de {totalSlots} slots ocupados ({porcentaje}%)
        </span>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
            <span className="text-xs text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
            <span className="text-xs text-muted-foreground">Reservado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-500/30 border border-slate-500/50" />
            <span className="text-xs text-muted-foreground">Bloqueado</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : timeSlots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Sin horarios configurados</p>
          <p className="text-sm">
            No hay horarios disponibles para esta configuracion
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-card">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border sticky left-0 bg-card z-10 min-w-[80px]">
                  Hora
                </th>
                {canchaNames.map((name) => (
                  <th
                    key={name}
                    className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border min-w-[120px]"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((hora) => {
                const horaIdx = timeSlots.indexOf(hora);
                const nextHora = timeSlots[horaIdx + 1] ?? "24:00";
                const isCurrentHour =
                  isToday && hora <= currentHour && nextHora > currentHour;

                return (
                  <tr
                    key={hora}
                    className={cn(
                      "border-b border-border/50",
                      isCurrentHour && "ring-2 ring-blue-500/50 ring-inset"
                    )}
                  >
                    <td className="px-3 py-2 text-sm font-mono text-muted-foreground sticky left-0 bg-card z-10 border-r border-border/30">
                      {hora}
                    </td>
                    {canchaNames.map((cancha) => {
                      const slot = slotMap.get(`${hora}|${cancha}`);
                      const estado = slot?.estado ?? "disponible";

                      return (
                        <td
                          key={cancha}
                          onClick={() => handleCellClick(hora, cancha)}
                          className={cn(
                            "px-3 py-2 text-center text-xs cursor-pointer transition-colors border-r border-border/20 last:border-r-0",
                            estado === "disponible" &&
                              "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400",
                            estado === "reservado" &&
                              "bg-red-500/10 hover:bg-red-500/20 text-red-400",
                            estado === "bloqueado" &&
                              "bg-slate-500/10 hover:bg-slate-500/15 text-slate-400"
                          )}
                        >
                          {estado === "disponible" && "Libre"}
                          {estado === "reservado" && (
                            <span className="truncate block max-w-[100px] mx-auto">
                              {slot?.cliente_nombre || "Reservado"}
                            </span>
                          )}
                          {estado === "bloqueado" && "Bloqueado"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
