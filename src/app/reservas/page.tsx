"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { cn, formatDate, formatRelative, getWhatsAppLink } from "@/lib/utils";
import { CENTROS, ESTADO_RESERVA_COLORS, type CentroName } from "@/lib/constants";
import type { Reserva } from "@/lib/types";
import { NuevaReservaDialog } from "@/components/reservas/NuevaReservaDialog";

const ITEMS_PER_PAGE = 25;

const ESTADOS = [
  "",
  "pendiente",
  "confirmada",
  "cancelada",
  "completada",
  "no_show",
] as const;

const CANALES = [
  "",
  "bot",
  "easycancha",
  "telefono",
  "presencial",
  "dashboard",
] as const;

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReservasPage() {
  const supabase = createClient();

  // Filters
  const [fecha, setFecha] = useState(todayStr());
  const [centro, setCentro] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [canal, setCanal] = useState<string>("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);

  // Data
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const fetchReservas = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("reservas")
      .select("*", { count: "exact" })
      .order("hora", { ascending: true })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (fecha) query = query.eq("fecha", fecha);
    if (centro) query = query.eq("centro", centro);
    if (estado) query = query.eq("estado", estado);
    if (canal) query = query.eq("canal_origen", canal);

    const { data, count, error } = await query;

    if (!error) {
      setReservas((data as Reserva[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [supabase, fecha, centro, estado, canal, page]);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [fecha, centro, estado, canal]);

  const handleConfirmar = async (reserva: Reserva) => {
    // Optimistic update
    setReservas((prev) =>
      prev.map((r) =>
        r.id === reserva.id ? { ...r, estado: "confirmada" } : r
      )
    );

    const { error } = await supabase
      .from("reservas")
      .update({ estado: "confirmada" })
      .eq("id", reserva.id);

    if (error) {
      // Revert on error
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reserva.id ? { ...r, estado: reserva.estado } : r
        )
      );
    }
  };

  const handleCancelar = async (reserva: Reserva) => {
    const confirmed = window.confirm(
      `Cancelar reserva de ${reserva.nombre_cliente || "cliente"} a las ${reserva.hora?.substring(0, 5)} en ${reserva.cancha}?`
    );
    if (!confirmed) return;

    // Optimistic update
    setReservas((prev) =>
      prev.map((r) =>
        r.id === reserva.id ? { ...r, estado: "cancelada" } : r
      )
    );

    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", reserva.id);

    if (error) {
      // Revert on error
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reserva.id ? { ...r, estado: reserva.estado } : r
        )
      );
      return;
    }

    // Free all slots linked to this reservation (supports multi-slot bookings)
    await supabase
      .from("slots")
      .update({
        estado: "disponible",
        reserva_id: null,
        origen: null,
        cliente_nombre: null,
        cliente_telefono: null,
        updated_at: new Date().toISOString(),
      })
      .eq("reserva_id", String(reserva.id));
  };

  return (
    <AppShell>
      <NuevaReservaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchReservas}
      />

      <Header title="Reservas" description="Gestion de reservas">
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nueva Reserva</span>
        </button>
        <button
          onClick={fetchReservas}
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
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <select
          value={centro}
          onChange={(e) => setCentro(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los centros</option>
          {(Object.keys(CENTROS) as CentroName[]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e === "" ? "Todos los estados" : e.charAt(0).toUpperCase() + e.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {c === "" ? "Todos los canales" : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <span className="text-sm text-muted-foreground ml-auto">
          {totalCount} reservas
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : reservas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Sin reservas</p>
          <p className="text-sm">
            No se encontraron reservas con los filtros aplicados
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-card">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Hora
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Cliente
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Centro
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Cancha
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Canal
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => (
                  <tr
                    key={reserva.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-sm font-mono text-foreground">
                      {reserva.hora?.substring(0, 5) || "—"}
                      {reserva.duracion && reserva.duracion > 60 && (
                        <span className="ml-1.5 text-xs text-muted-foreground font-sans">
                          {reserva.duracion}min
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {reserva.nombre_cliente || "Sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {reserva.telefono_cliente || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">
                      {reserva.centro || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">
                      <span className="text-xs text-muted-foreground/60">
                        {reserva.tipo_cancha ? `${reserva.tipo_cancha} ` : ""}
                      </span>
                      {reserva.cancha || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          ESTADO_RESERVA_COLORS[reserva.estado] ||
                            "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {reserva.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground capitalize">
                      {reserva.canal_origen || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {reserva.estado === "pendiente" && (
                          <button
                            onClick={() => handleConfirmar(reserva)}
                            className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {(reserva.estado === "pendiente" ||
                          reserva.estado === "confirmada") && (
                          <button
                            onClick={() => handleCancelar(reserva)}
                            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        {reserva.telefono_cliente && (
                          <a
                            href={getWhatsAppLink(reserva.telefono_cliente)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                            title="WhatsApp"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {page * ITEMS_PER_PAGE + 1}–
              {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} de{" "}
              {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
