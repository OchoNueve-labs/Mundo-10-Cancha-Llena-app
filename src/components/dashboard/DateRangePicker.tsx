"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

function startOfCurrentMonth(): string {
  const d = new Date();
  d.setDate(1);
  return toDateStr(d);
}

const PRESETS = [
  { label: "Hoy", getRange: (): DateRange => ({ from: todayStr(), to: todayStr() }) },
  { label: "7d", getRange: (): DateRange => ({ from: daysAgo(6), to: todayStr() }) },
  { label: "14d", getRange: (): DateRange => ({ from: daysAgo(13), to: todayStr() }) },
  { label: "30d", getRange: (): DateRange => ({ from: daysAgo(29), to: todayStr() }) },
  { label: "Este mes", getRange: (): DateRange => ({ from: startOfCurrentMonth(), to: todayStr() }) },
] as const;

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const activePreset = PRESETS.find(
    (p) => {
      const r = p.getRange();
      return r.from === value.from && r.to === value.to;
    }
  );

  const fromDate = new Date(value.from + "T12:00:00");
  const toDate = new Date(value.to + "T12:00:00");

  const fromLabel = format(fromDate, "dd MMM", { locale: es });
  const toLabel = format(toDate, "dd MMM yyyy", { locale: es });
  const rangeLabel = value.from === value.to
    ? format(fromDate, "dd MMM yyyy", { locale: es })
    : `${fromLabel} — ${toLabel}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.getRange())}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              activePreset?.label === preset.label
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-1.5">
        <Popover open={openFrom} onOpenChange={setOpenFrom}>
          <PopoverTrigger
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{format(fromDate, "dd/MM/yyyy")}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              selected={fromDate}
              onSelect={(date) => {
                if (date) {
                  const newFrom = toDateStr(date);
                  onChange({
                    from: newFrom,
                    to: newFrom > value.to ? newFrom : value.to,
                  });
                }
                setOpenFrom(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground">—</span>

        <Popover open={openTo} onOpenChange={setOpenTo}>
          <PopoverTrigger
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{format(toDate, "dd/MM/yyyy")}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              selected={toDate}
              onSelect={(date) => {
                if (date) {
                  const newTo = toDateStr(date);
                  onChange({
                    from: newTo < value.from ? newTo : value.from,
                    to: newTo,
                  });
                }
                setOpenTo(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Range summary */}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {rangeLabel}
      </span>
    </div>
  );
}
