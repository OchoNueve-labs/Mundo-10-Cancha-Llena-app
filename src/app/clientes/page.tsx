"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import {
  cn,
  formatDate,
  formatRelative,
  getWhatsAppLink,
} from "@/lib/utils";
import type { Cliente, Mensaje, MensajeRaw, Reserva } from "@/lib/types";

const ITEMS_PER_PAGE = 25;

const CANALES = ["", "whatsapp", "messenger", "instagram"] as const;

export default function ClientesPage() {
  const supabase = createClient();

  // Filters
  const [search, setSearch] = useState("");
  const [canal, setCanal] = useState<string>("");

  // Data
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMensajes, setExpandedMensajes] = useState<Mensaje[]>([]);
  const [expandedReservas, setExpandedReservas] = useState<Reserva[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const fetchClientes = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("clientes")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (canal) query = query.eq("canal", canal);

    // Text search on nombre or telefono
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%,sender_id.ilike.%${search}%,rut.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching clientes:", error.message, error.code, error.details, error.hint);
    } else {
      setClientes((data as Cliente[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [supabase, search, canal, page]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, canal]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleExpandRow = async (cliente: Cliente) => {
    if (expandedId === cliente.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(cliente.id);
    setLoadingExpanded(true);

    // Fetch outbound msgs, inbound msgs (raw), and reservas in parallel
    const [outboundRes, inboundRes, reservasRes] = await Promise.all([
      supabase
        .from("mensajes")
        .select("*")
        .eq("sender_id", cliente.sender_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("mensajes_raw")
        .select("*")
        .eq("sender_id", cliente.sender_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("reservas")
        .select("*")
        .or(`cliente_id.eq.${cliente.id},telefono_cliente.eq.${cliente.telefono}`)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const outbound = (outboundRes.data as Mensaje[]) || [];
    const inbound = ((inboundRes.data as MensajeRaw[]) || []).map((raw) => ({
      id: raw.id as unknown as number,
      sender_id: raw.sender_id,
      canal: raw.canal,
      direccion: "inbound" as const,
      contenido: raw.mensaje,
      message_id: raw.message_id,
      created_at: raw.created_at,
    }));

    const merged = [...outbound, ...inbound]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    setExpandedMensajes(merged);
    setExpandedReservas((reservasRes.data as Reserva[]) || []);
    setLoadingExpanded(false);
  };

  return (
    <AppShell>
      <Header title="Clientes" description="Base de datos de clientes">
        <button
          onClick={fetchClientes}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </Header>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, telefono o sender_id..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

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
          {totalCount} clientes
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Sin clientes</p>
          <p className="text-sm">No se encontraron clientes con los filtros aplicados</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-card">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border w-8" />
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Nombre
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Telefono
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    RUT
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Email
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Canal
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Registrado
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Actualizado
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <>
                    <tr
                      key={cliente.id}
                      onClick={() => handleExpandRow(cliente)}
                      className={cn(
                        "border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer",
                        expandedId === cliente.id && "bg-accent/20"
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {expandedId === cliente.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-foreground">
                        {cliente.nombre || "Sin nombre"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-foreground font-mono">
                        {cliente.telefono || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {cliente.rut || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {cliente.email || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground capitalize">
                        {cliente.canal || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {formatDate(cliente.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {formatRelative(cliente.updated_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {cliente.telefono && (
                            <a
                              href={getWhatsAppLink(cliente.telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                              title="WhatsApp"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpandRow(cliente);
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedId === cliente.id && (
                      <tr key={`${cliente.id}-expanded`}>
                        <td colSpan={9} className="px-6 py-4 bg-accent/10 border-b border-border">
                          {loadingExpanded ? (
                            <div className="space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Last 5 Messages */}
                              <div>
                                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Ultimos mensajes
                                </h4>
                                {expandedMensajes.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Sin mensajes</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {expandedMensajes.map((msg) => (
                                      <div
                                        key={msg.id}
                                        className="flex items-start gap-2 text-xs"
                                      >
                                        <span
                                          className={cn(
                                            "shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                            msg.direccion === "inbound"
                                              ? "bg-muted text-muted-foreground"
                                              : "bg-emerald-500/20 text-emerald-400"
                                          )}
                                        >
                                          {msg.direccion === "inbound" ? "IN" : "OUT"}
                                        </span>
                                        <span className="text-foreground truncate flex-1">
                                          {msg.contenido || "[sin contenido]"}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                          {formatRelative(msg.created_at)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Last 5 Reservas */}
                              <div>
                                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  Ultimas reservas
                                </h4>
                                {expandedReservas.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Sin reservas</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {expandedReservas.map((res) => (
                                      <div
                                        key={res.id}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <span className="text-muted-foreground shrink-0">
                                          {formatDate(res.fecha)}
                                        </span>
                                        <span className="text-foreground">
                                          {res.centro} - {res.cancha}
                                        </span>
                                        <span className="text-muted-foreground font-mono">
                                          {res.hora?.substring(0, 5)}
                                        </span>
                                        <span
                                          className={cn(
                                            "px-1.5 py-0.5 rounded-full text-[10px] font-medium border ml-auto",
                                            res.estado === "confirmada"
                                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                              : res.estado === "cancelada"
                                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                          )}
                                        >
                                          {res.estado}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {page * ITEMS_PER_PAGE + 1}–
              {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} de {totalCount}
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
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
