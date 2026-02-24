"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  Inbox,
  ExternalLink,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { cn, formatRelative, getWhatsAppLink } from "@/lib/utils";
import { ALERTA_TIPO_COLORS } from "@/lib/constants";
import type { Alerta, Cliente, Reserva } from "@/lib/types";

const TIPOS = [
  "",
  "reserva",
  "easycancha_sync",
  "easycancha_manual",
  "easycancha_error",
  "escalamiento",
  "escalamietno", // typo in existing n8n data
  "error",
] as const;

const LEIDA_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "unread", label: "No leidas" },
  { value: "read", label: "Leidas" },
] as const;

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AlertasPage() {
  const supabase = createClient();

  // Filters
  const [tipo, setTipo] = useState<string>("");
  const [leidaFilter, setLeidaFilter] = useState<string>("unread");
  const [fecha, setFecha] = useState<string>("");

  // Data
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [clientesMap, setClientesMap] = useState<Map<string, Cliente>>(new Map());
  const [reservasMap, setReservasMap] = useState<Map<number, Reserva>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchClientes = useCallback(async (senderIds: string[]) => {
    if (senderIds.length === 0) return;

    const { data } = await supabase
      .from("clientes")
      .select("*")
      .in("sender_id", senderIds);

    if (data) {
      const map = new Map<string, Cliente>();
      for (const cliente of data as Cliente[]) {
        map.set(cliente.sender_id, cliente);
      }
      setClientesMap(map);
    }
  }, [supabase]);

  const fetchReservas = useCallback(async (reservaIds: number[]) => {
    if (reservaIds.length === 0) return;

    const { data } = await supabase
      .from("reservas")
      .select("id, nombre_cliente, telefono_cliente")
      .in("id", reservaIds);

    if (data) {
      const map = new Map<number, Reserva>();
      for (const r of data as Reserva[]) {
        map.set(r.id, r);
      }
      setReservasMap(map);
    }
  }, [supabase]);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("alertas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tipo) query = query.eq("tipo", tipo);
    if (leidaFilter === "unread") query = query.eq("leida", false);
    if (leidaFilter === "read") query = query.eq("leida", true);
    if (fecha) query = query.gte("created_at", `${fecha}T00:00:00`).lte("created_at", `${fecha}T23:59:59`);

    const { data, error } = await query;

    if (!error) {
      const alertasData = (data as Alerta[]) || [];
      setAlertas(alertasData);

      // Fetch client info via sender_id (filter out "No disponible" placeholder from n8n)
      const senderIds = [
        ...new Set(
          alertasData
            .map((a) => a.sender_id)
            .filter((id) => id && id !== "No disponible") as string[]
        ),
      ];
      fetchClientes(senderIds);

      // Fetch reservation info via reserva_id
      const reservaIds = [
        ...new Set(alertasData.map((a) => a.reserva_id).filter(Boolean) as number[]),
      ];
      fetchReservas(reservaIds);
    }
    setLoading(false);
  }, [supabase, tipo, leidaFilter, fecha, fetchClientes, fetchReservas]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  // Realtime subscription for new alerts
  useEffect(() => {
    const channel = supabase
      .channel("alertas-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertas" },
        (payload) => {
          const newAlerta = payload.new as Alerta;
          setAlertas((prev) => [newAlerta, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleMarkRead = async (alerta: Alerta) => {
    // Optimistic update
    setAlertas((prev) =>
      prev.map((a) => (a.id === alerta.id ? { ...a, leida: true } : a))
    );

    const { error } = await supabase
      .from("alertas")
      .update({ leida: true })
      .eq("id", alerta.id);

    if (error) {
      // Revert on error
      setAlertas((prev) =>
        prev.map((a) =>
          a.id === alerta.id ? { ...a, leida: alerta.leida } : a
        )
      );
    }
  };

  const handleMarkResolved = async (alerta: Alerta) => {
    // Optimistic update
    setAlertas((prev) =>
      prev.map((a) =>
        a.id === alerta.id ? { ...a, resuelta: true, leida: true } : a
      )
    );

    const { error } = await supabase
      .from("alertas")
      .update({ resuelta: true, leida: true })
      .eq("id", alerta.id);

    if (error) {
      // Revert on error
      setAlertas((prev) =>
        prev.map((a) =>
          a.id === alerta.id
            ? { ...a, resuelta: alerta.resuelta, leida: alerta.leida }
            : a
        )
      );
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = alertas.filter((a) => !a.leida).map((a) => a.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setAlertas((prev) => prev.map((a) => ({ ...a, leida: true })));

    const { error } = await supabase
      .from("alertas")
      .update({ leida: true })
      .in("id", unreadIds);

    if (error) {
      // Refetch on error
      fetchAlertas();
    }
  };

  const unreadCount = alertas.filter((a) => !a.leida).length;

  return (
    <AppShell>
      <Header title="Alertas" description="Centro de notificaciones">
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Marcar todas como leidas</span>
          </button>
        )}
        <button
          onClick={fetchAlertas}
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
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t === ""
                ? "Todos los tipos"
                : t
                    .replace(/_/g, " ")
                    .replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          value={leidaFilter}
          onChange={(e) => setLeidaFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {LEIDA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <span className="text-sm text-muted-foreground ml-auto">
          {alertas.length} alertas
          {unreadCount > 0 && (
            <span className="ml-1 text-primary">
              ({unreadCount} sin leer)
            </span>
          )}
        </span>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Sin alertas</p>
          <p className="text-sm">
            No se encontraron alertas con los filtros aplicados
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.map((alerta) => {
            const rawSenderId = alerta.sender_id && alerta.sender_id !== "No disponible" ? alerta.sender_id : null;
            const cliente = rawSenderId ? clientesMap.get(rawSenderId) : undefined;
            const reserva = alerta.reserva_id ? reservasMap.get(alerta.reserva_id) : undefined;

            const clienteNombre = cliente?.nombre || reserva?.nombre_cliente || rawSenderId;
            const clienteTelefono = cliente?.telefono || reserva?.telefono_cliente;

            return (
              <div
                key={alerta.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  !alerta.leida
                    ? "bg-card border-border"
                    : "bg-card/50 border-border/50 opacity-75"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Left: badge + content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          ALERTA_TIPO_COLORS[alerta.tipo] ||
                            "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {alerta.tipo?.replace(/_/g, " ")}
                      </span>
                      {alerta.canal && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {alerta.canal}
                        </span>
                      )}
                      {!alerta.leida && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      {alerta.resuelta && (
                        <span className="text-xs text-emerald-400">
                          Resuelta
                        </span>
                      )}
                    </div>

                    {/* Client info */}
                    {(clienteNombre || clienteTelefono) && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          {clienteNombre}
                        </span>
                        {clienteTelefono && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {clienteTelefono}
                          </span>
                        )}
                        {clienteTelefono && (
                          <a
                            href={getWhatsAppLink(clienteTelefono)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                            title="WhatsApp"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-foreground">
                      {alerta.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelative(alerta.created_at)}
                    </p>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!alerta.leida && (
                      <button
                        onClick={() => handleMarkRead(alerta)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Marcar como leida"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {!alerta.resuelta && (
                      <button
                        onClick={() => handleMarkResolved(alerta)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Marcar como resuelta"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
