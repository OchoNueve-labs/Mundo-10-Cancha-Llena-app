export const CENTROS = {
  "Lo Prado": {
    canchas: [
      {
        tipo: "Futbolito" as const,
        cantidad: 6,
        nombres: [
          "Cancha 1",
          "Cancha 2",
          "Cancha 3",
          "Cancha 4",
          "Cancha 5",
          "Cancha 6",
        ],
        horario: { inicio: "09:00", fin: "23:00" },
        intervalo: 60,
      },
    ],
  },
  Quilicura: {
    canchas: [
      {
        tipo: "Futbolito" as const,
        cantidad: 4,
        nombres: ["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4"],
        horario: { inicio: "08:00", fin: "23:00" },
        intervalo: 60,
      },
      {
        tipo: "Padel" as const,
        cantidad: 3,
        nombres: ["Cancha 1", "Cancha 2", "Cancha 3"],
        horario: { inicio: "08:30", fin: "24:00" },
        intervalo: 30,
        duraciones: [60, 90, 120],
      },
    ],
  },
} as const;

export type CentroName = keyof typeof CENTROS;
export type TipoCancha = "Futbolito" | "Padel";

export const ESTADO_RESERVA_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelada: "bg-red-500/20 text-red-400 border-red-500/30",
  completada: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  no_show: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export const ALERTA_TIPO_COLORS: Record<string, string> = {
  reserva: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  easycancha_sync: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  easycancha_manual: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  easycancha_error: "bg-red-500/20 text-red-400 border-red-500/30",
  escalamiento: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  error: "bg-slate-800/80 text-slate-300 border-slate-600/30",
};

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/disponibilidad", label: "Disponibilidad", icon: "CalendarDays" },
  { href: "/reservas", label: "Reservas", icon: "BookOpen" },
  { href: "/alertas", label: "Alertas", icon: "Bell" },
  { href: "/conversaciones", label: "Conversaciones", icon: "MessageSquare" },
  { href: "/clientes", label: "Clientes", icon: "Users" },
] as const;
