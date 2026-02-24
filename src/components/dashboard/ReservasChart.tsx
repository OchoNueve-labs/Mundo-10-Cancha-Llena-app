"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ReservasPorDia } from "@/lib/types";

interface ReservasChartProps {
  data: ReservasPorDia[];
}

export function ReservasChart({ data }: ReservasChartProps) {
  const chartData = useMemo(() => {
    const byDate = new Map<string, { fecha: string; "Lo Prado": number; Quilicura: number }>();

    for (const item of data) {
      const dateLabel = item.fecha.substring(5); // MM-DD
      if (!byDate.has(item.fecha)) {
        byDate.set(item.fecha, { fecha: dateLabel, "Lo Prado": 0, Quilicura: 0 });
      }
      const entry = byDate.get(item.fecha)!;
      if (item.centro === "Lo Prado") entry["Lo Prado"] = item.total;
      if (item.centro === "Quilicura") entry["Quilicura"] = item.total;
    }

    return Array.from(byDate.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        Sin datos de reservas
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 18%)" />
        <XAxis
          dataKey="fecha"
          tick={{ fill: "hsl(215 20.2% 55.1%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(217 33% 18%)" }}
        />
        <YAxis
          tick={{ fill: "hsl(215 20.2% 55.1%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(217 33% 18%)" }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(217 33% 10%)",
            border: "1px solid hsl(217 33% 18%)",
            borderRadius: "8px",
            color: "hsl(210 40% 98%)",
          }}
        />
        <Legend wrapperStyle={{ color: "hsl(215 20.2% 55.1%)" }} />
        <Bar dataKey="Lo Prado" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Quilicura" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
