"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  BarChart3,
  MessageSquare,
  Bell,
  Bot,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ReservasChart } from "@/components/dashboard/ReservasChart";
import { ProximasReservas } from "@/components/dashboard/ProximasReservas";
import { HorariosMuertos } from "@/components/dashboard/HorariosMuertos";
import { UltimasAlertas } from "@/components/dashboard/UltimasAlertas";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/dashboard/DateRangePicker";
import { cn, normalizeCancha } from "@/lib/utils";
import type {
  Reserva,
  Alerta,
  OcupacionCentro,
  ReservasPorDia,
  HorarioMuerto,
} from "@/lib/types";

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayStr() {
  return toLocalDateStr(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DashboardPage() {
  const supabase = createClient();

  // Date range state — default: last 7 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: daysAgo(6),
    to: todayStr(),
  });

  const { from: dateFrom, to: dateTo } = dateRange;
  const isSingleDay = dateFrom === dateTo;
  const isToday = dateTo === todayStr();

  // KPI states
  const [reservasCount, setReservasCount] = useState(0);
  const [ocupacionLP, setOcupacionLP] = useState<OcupacionCentro>({
    centro: "Lo Prado",
    reservados: 0,
    disponibles: 0,
    total: 0,
    porcentaje: 0,
  });
  const [ocupacionQ, setOcupacionQ] = useState<OcupacionCentro>({
    centro: "Quilicura",
    reservados: 0,
    disponibles: 0,
    total: 0,
    porcentaje: 0,
  });
  const [mensajesCount, setMensajesCount] = useState(0);
  const [alertasPendientes, setAlertasPendientes] = useState(0);
  const [canceladasCount, setCanceladasCount] = useState(0);
  const [botCount, setBotCount] = useState(0);
  const [easycanchaCount, setEasycanchaCount] = useState(0);

  // Widget states
  const [reservasChart, setReservasChart] = useState<ReservasPorDia[]>([]);
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([]);
  const [horariosMuertos, setHorariosMuertos] = useState<HorarioMuerto[]>([]);
  const [ultimasAlertas, setUltimasAlertas] = useState<Alerta[]>([]);

  // Loading states
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingProximas, setLoadingProximas] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(true);
  const [loadingAlertas, setLoadingAlertas] = useState(true);

  // --- KPI Fetchers ---
  const fetchKpis = useCallback(async () => {
    setLoadingKpi(true);

    // Reservas in date range
    const { count: rCount } = await supabase
      .from("reservas")
      .select("*", { count: "exact", head: true })
      .gte("fecha", dateFrom)
      .lte("fecha", dateTo);
    setReservasCount(rCount || 0);

    // Tasa de cancelacion en date range
    const { count: cancelCount } = await supabase
      .from("reservas")
      .select("*", { count: "exact", head: true })
      .gte("fecha", dateFrom)
      .lte("fecha", dateTo)
      .eq("estado", "cancelada");
    setCanceladasCount(cancelCount || 0);

    // Ocupacion Lo Prado — solo horario prime (17:00+)
    // Reconcilia slots con reservas activas (bot puede crear reservas sin actualizar slots)
    const [slotsLPRes, reservasLPRes] = await Promise.all([
      supabase
        .from("slots")
        .select("fecha, hora, cancha, estado")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo)
        .eq("centro", "Lo Prado")
        .gte("hora", "17:00:00"),
      supabase
        .from("reservas")
        .select("fecha, hora, cancha")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo)
        .eq("centro", "Lo Prado")
        .gte("hora", "17:00:00")
        .not("estado", "in", '("cancelada","no_show")'),
    ]);
    if (slotsLPRes.data) {
      const slotsLP = slotsLPRes.data;
      const reservasLP = reservasLPRes.data || [];
      // Set of occupied keys: fecha|hora|cancha
      const occupiedKeys = new Set<string>();
      for (const s of slotsLP) {
        if (s.estado !== "disponible") {
          occupiedKeys.add(`${s.fecha}|${s.hora?.substring(0, 5)}|${s.cancha}`);
        }
      }
      for (const r of reservasLP) {
        occupiedKeys.add(`${r.fecha}|${r.hora?.substring(0, 5)}|${normalizeCancha(r.cancha)}`);
      }
      // Count how many actual slots are occupied
      let reservados = 0;
      for (const s of slotsLP) {
        const key = `${s.fecha}|${s.hora?.substring(0, 5)}|${s.cancha}`;
        if (occupiedKeys.has(key)) reservados++;
      }
      const total = slotsLP.length;
      const disponibles = total - reservados;
      const porcentaje = total > 0 ? Math.round((reservados / total) * 100) : 0;
      setOcupacionLP({ centro: "Lo Prado", reservados, disponibles, total, porcentaje });
    }

    // Ocupacion Quilicura — solo horario prime (17:00+)
    // Reconcilia slots con reservas activas; maneja Futbolito (60min) y Padel (30min)
    const [slotsQRes, reservasQRes] = await Promise.all([
      supabase
        .from("slots")
        .select("fecha, hora, cancha, estado, tipo_cancha")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo)
        .eq("centro", "Quilicura")
        .gte("hora", "17:00:00"),
      supabase
        .from("reservas")
        .select("fecha, hora, cancha, duracion, tipo_cancha")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo)
        .eq("centro", "Quilicura")
        .gte("hora", "15:00:00") // captura spillovers de Padel hacia 17:00+
        .not("estado", "in", '("cancelada","no_show")'),
    ]);
    if (slotsQRes.data) {
      const slotsQ = slotsQRes.data;
      const reservasQ = reservasQRes.data || [];
      // Set of occupied keys: fecha|tipo_cancha|hora|cancha
      const occupiedKeys = new Set<string>();
      for (const s of slotsQ) {
        if (s.estado !== "disponible") {
          occupiedKeys.add(`${s.fecha}|${s.tipo_cancha}|${s.hora?.substring(0, 5)}|${s.cancha}`);
        }
      }
      for (const r of reservasQ) {
        const tipo = r.tipo_cancha === "Pádel" ? "Padel" : r.tipo_cancha;
        const intervalo = tipo === "Padel" ? 30 : 60;
        const duracion = r.duracion ?? intervalo;
        const slotsNeeded = Math.max(1, Math.floor(duracion / intervalo));
        const horaStart = r.hora?.substring(0, 5) ?? "";
        const [hh, mm] = horaStart.split(":").map(Number);
        const startMin = hh * 60 + mm;
        for (let i = 0; i < slotsNeeded; i++) {
          const totalMin = startMin + i * intervalo;
          if (totalMin < 17 * 60) continue; // solo prime time
          const sh = Math.floor(totalMin / 60).toString().padStart(2, "0");
          const sm = (totalMin % 60).toString().padStart(2, "0");
          occupiedKeys.add(`${r.fecha}|${tipo}|${sh}:${sm}|${normalizeCancha(r.cancha)}`);
        }
      }
      let reservados = 0;
      for (const s of slotsQ) {
        const key = `${s.fecha}|${s.tipo_cancha}|${s.hora?.substring(0, 5)}|${s.cancha}`;
        if (occupiedKeys.has(key)) reservados++;
      }
      const total = slotsQ.length;
      const disponibles = total - reservados;
      const porcentaje = total > 0 ? Math.round((reservados / total) * 100) : 0;
      setOcupacionQ({ centro: "Quilicura", reservados, disponibles, total, porcentaje });
    }

    // Mensajes in date range
    const { count: mCount } = await supabase
      .from("mensajes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`);
    setMensajesCount(mCount || 0);

    // Alertas pendientes (always global, not filtered by date)
    const { count: aCount } = await supabase
      .from("alertas")
      .select("*", { count: "exact", head: true })
      .eq("leida", false);
    setAlertasPendientes(aCount || 0);

    // Bot vs EasyCancha in date range
    const { data: canalData } = await supabase
      .from("reservas")
      .select("canal_origen")
      .gte("fecha", dateFrom)
      .lte("fecha", dateTo);
    if (canalData) {
      setBotCount(canalData.filter((r) => r.canal_origen === "bot").length);
      setEasycanchaCount(canalData.filter((r) => r.canal_origen === "easycancha").length);
    }

    setLoadingKpi(false);
  }, [supabase, dateFrom, dateTo]);

  // --- Chart: Reservas in date range ---
  const fetchChart = useCallback(async () => {
    setLoadingChart(true);
    const { data } = await supabase
      .from("reservas")
      .select("fecha, centro")
      .gte("fecha", dateFrom)
      .lte("fecha", dateTo);

    if (data) {
      const grouped = new Map<string, ReservasPorDia>();
      for (const row of data) {
        const key = `${row.fecha}|${row.centro}`;
        if (!grouped.has(key)) {
          grouped.set(key, { fecha: row.fecha, centro: row.centro, total: 0 });
        }
        grouped.get(key)!.total++;
      }
      setReservasChart(Array.from(grouped.values()));
    }
    setLoadingChart(false);
  }, [supabase, dateFrom, dateTo]);

  // --- Proximas reservas (next 7 days) ---
  const fetchProximas = useCallback(async () => {
    setLoadingProximas(true);
    const today = todayStr();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7days = toLocalDateStr(in7);

    const { data } = await supabase
      .from("reservas")
      .select("*")
      .gte("fecha", today)
      .lte("fecha", in7days)
      .in("estado", ["pendiente", "confirmada"])
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
      .limit(20);

    setProximasReservas((data as Reserva[]) || []);
    setLoadingProximas(false);
  }, [supabase]);

  // --- Horarios muertos (in date range) — reconcilia con reservas ---
  const fetchHorarios = useCallback(async () => {
    setLoadingHorarios(true);
    const [slotsRes, reservasRes] = await Promise.all([
      supabase
        .from("slots")
        .select("fecha, hora, cancha, estado, tipo_cancha, centro")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo)
        .gte("hora", "17:00:00"),
      supabase
        .from("reservas")
        .select("fecha, hora, cancha, duracion, tipo_cancha, centro")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo)
        .gte("hora", "15:00:00") // captura spillovers de Padel
        .not("estado", "in", '("cancelada","no_show")'),
    ]);

    if (slotsRes.data) {
      const slotsData = slotsRes.data;
      const reservasData = reservasRes.data || [];

      // Build set of occupied keys: fecha|centro|tipo_cancha|hora|cancha
      const occupiedKeys = new Set<string>();
      for (const s of slotsData) {
        if (s.estado !== "disponible") {
          occupiedKeys.add(`${s.fecha}|${s.centro}|${s.tipo_cancha}|${s.hora?.substring(0, 5)}|${s.cancha}`);
        }
      }
      for (const r of reservasData) {
        const tipo = r.tipo_cancha === "Pádel" ? "Padel" : r.tipo_cancha;
        const intervalo = tipo === "Padel" ? 30 : 60;
        const duracion = r.duracion ?? intervalo;
        const slotsNeeded = Math.max(1, Math.floor(duracion / intervalo));
        const horaStart = r.hora?.substring(0, 5) ?? "";
        const [hh, mm] = horaStart.split(":").map(Number);
        const startMin = hh * 60 + mm;
        for (let i = 0; i < slotsNeeded; i++) {
          const totalMin = startMin + i * intervalo;
          if (totalMin < 17 * 60) continue;
          const sh = Math.floor(totalMin / 60).toString().padStart(2, "0");
          const sm = (totalMin % 60).toString().padStart(2, "0");
          occupiedKeys.add(`${r.fecha}|${r.centro}|${tipo}|${sh}:${sm}|${normalizeCancha(r.cancha)}`);
        }
      }

      // Compute per-hora stats checking each slot against occupied set
      const byHora = new Map<string, { total: number; libres: number }>();
      for (const s of slotsData) {
        const hora = s.hora?.substring(0, 5) ?? "";
        if (!byHora.has(hora)) byHora.set(hora, { total: 0, libres: 0 });
        const entry = byHora.get(hora)!;
        entry.total++;
        const key = `${s.fecha}|${s.centro}|${s.tipo_cancha}|${hora}|${s.cancha}`;
        if (!occupiedKeys.has(key)) entry.libres++;
      }

      const sorted = Array.from(byHora.entries())
        .map(([hora, stats]) => ({
          hora,
          libres: stats.libres,
          total: stats.total,
        }))
        .sort((a, b) => {
          const pctA = a.total > 0 ? a.libres / a.total : 0;
          const pctB = b.total > 0 ? b.libres / b.total : 0;
          return pctB - pctA;
        })
        .slice(0, 5);

      setHorariosMuertos(sorted);
    }
    setLoadingHorarios(false);
  }, [supabase, dateFrom, dateTo]);

  // --- Ultimas alertas (always global) ---
  const fetchAlertas = useCallback(async () => {
    setLoadingAlertas(true);
    const { data } = await supabase
      .from("alertas")
      .select("*")
      .eq("leida", false)
      .order("created_at", { ascending: false })
      .limit(5);

    setUltimasAlertas((data as Alerta[]) || []);
    setLoadingAlertas(false);
  }, [supabase]);

  // --- Fetch all when date range changes ---
  useEffect(() => {
    fetchKpis();
    fetchChart();
    fetchProximas();
    fetchHorarios();
    fetchAlertas();
  }, [fetchKpis, fetchChart, fetchProximas, fetchHorarios, fetchAlertas]);

  // --- Realtime subscriptions ---
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservas" },
        () => {
          fetchKpis();
          fetchProximas();
          fetchChart();
          fetchHorarios();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas" },
        () => {
          fetchKpis();
          fetchChart();
          fetchHorarios();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertas" },
        (payload) => {
          setAlertasPendientes((p) => p + 1);
          setUltimasAlertas((prev) => [payload.new as Alerta, ...prev].slice(0, 5));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "slots" },
        () => {
          fetchKpis();
          fetchHorarios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchKpis, fetchProximas, fetchChart, fetchHorarios]);

  const refreshAll = () => {
    fetchKpis();
    fetchChart();
    fetchProximas();
    fetchHorarios();
    fetchAlertas();
  };

  const botLabel =
    botCount + easycanchaCount > 0
      ? `Bot: ${botCount} | EC: ${easycanchaCount}`
      : "Sin datos";

  const kpiDateLabel = isSingleDay ? "Hoy" : "Periodo";
  const tasaCancelacion = reservasCount > 0
    ? Math.round((canceladasCount / reservasCount) * 100)
    : 0;

  return (
    <AppShell>
      <Header title="Dashboard" description="Vista general del centro">
        <button
          onClick={refreshAll}
          disabled={loadingKpi}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loadingKpi && "animate-spin")} />
        </button>
      </Header>

      {/* Date Range Picker */}
      <div className="mb-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-6">
        <KpiCard
          title={`Reservas ${kpiDateLabel}`}
          value={loadingKpi ? "..." : reservasCount}
          icon={CalendarDays}
        />
        <KpiCard
          title={`Cancelaciones ${kpiDateLabel}`}
          value={loadingKpi ? "..." : `${tasaCancelacion}%`}
          subtitle={
            loadingKpi
              ? undefined
              : `${canceladasCount} de ${reservasCount}`
          }
          icon={XCircle}
          trend={tasaCancelacion > 15 ? "down" : undefined}
        />
        <KpiCard
          title="Ocupacion LP 17+"
          value={loadingKpi ? "..." : `${ocupacionLP.porcentaje}%`}
          subtitle={
            loadingKpi
              ? undefined
              : `${ocupacionLP.reservados}/${ocupacionLP.total}`
          }
          icon={BarChart3}
          trend={ocupacionLP.porcentaje >= 70 ? "up" : ocupacionLP.porcentaje < 30 ? "down" : undefined}
        />
        <KpiCard
          title="Ocupacion Q 17+"
          value={loadingKpi ? "..." : `${ocupacionQ.porcentaje}%`}
          subtitle={
            loadingKpi
              ? undefined
              : `${ocupacionQ.reservados}/${ocupacionQ.total}`
          }
          icon={BarChart3}
          trend={ocupacionQ.porcentaje >= 70 ? "up" : ocupacionQ.porcentaje < 30 ? "down" : undefined}
        />
        <KpiCard
          title={`Mensajes ${kpiDateLabel}`}
          value={loadingKpi ? "..." : mensajesCount}
          icon={MessageSquare}
        />
        <KpiCard
          title="Alertas"
          value={loadingKpi ? "..." : alertasPendientes}
          icon={Bell}
          trend={alertasPendientes > 0 ? "down" : undefined}
        />
        <KpiCard
          title="Bot vs EC"
          value={loadingKpi ? "..." : botCount + easycanchaCount}
          subtitle={loadingKpi ? undefined : botLabel}
          icon={Bot}
        />
        <KpiCard
          title="Tiempo Ahorrado"
          value={loadingKpi ? "..." : formatMinutes((botCount + easycanchaCount) * 8)}
          subtitle={
            loadingKpi
              ? undefined
              : `${botCount + easycanchaCount} reservas automatizadas`
          }
          icon={Clock}
          trend={botCount + easycanchaCount > 0 ? "up" : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        {/* Reservas Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Reservas — Periodo seleccionado
          </h3>
          {loadingChart ? (
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          ) : (
            <ReservasChart data={reservasChart} />
          )}
        </div>

        {/* Horarios Muertos */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Horarios con menor ocupacion (17+)
          </h3>
          <HorariosMuertos horarios={horariosMuertos} loading={loadingHorarios} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Proximas Reservas */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Proximas reservas
          </h3>
          <ProximasReservas reservas={proximasReservas} loading={loadingProximas} />
        </div>

        {/* Ultimas Alertas */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Ultimas alertas
          </h3>
          <UltimasAlertas alertas={ultimasAlertas} loading={loadingAlertas} />
        </div>
      </div>
    </AppShell>
  );
}
