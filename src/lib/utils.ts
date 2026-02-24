import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function formatDateTime(datetime: string): string {
  const d = parseISO(datetime);
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatRelative(datetime: string): string {
  const d = parseISO(datetime);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return formatDate(datetime);
}

export function getWhatsAppLink(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}`;
}

export function generateTimeSlots(inicio: string, fin: string, intervalo: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = inicio.split(":").map(Number);
  const [endH, endM] = fin.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  for (let m = startMinutes; m < endMinutes; m += intervalo) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return slots;
}
