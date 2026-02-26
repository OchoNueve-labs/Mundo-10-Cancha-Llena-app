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

/** Normalize cancha name variants ("1", "cancha 2", "Cancha1") → "Cancha 1" */
export function normalizeCancha(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (/^Cancha \d+$/.test(trimmed)) return trimmed;
  const numOnly = trimmed.match(/^(\d+)$/);
  if (numOnly) return `Cancha ${numOnly[1]}`;
  const canchaNum = trimmed.match(/^cancha\s*(\d+)$/i);
  if (canchaNum) return `Cancha ${canchaNum[1]}`;
  return trimmed;
}

/** Validate Chilean RUT format and verification digit (módulo 11) */
export function validateRut(rut: string): boolean {
  // Strip dots, spaces, and dashes; split body from check digit
  const cleaned = rut.replace(/[\.\s]/g, "").toUpperCase();
  const match = cleaned.match(/^(\d{7,8})-?([0-9K])$/);
  if (!match) return false;

  const body = match[1];
  const dv = match[2];

  // Módulo 11 algorithm
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return dv === expected;
}

/** Validate email format */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitize search input for PostgREST .or() filters to prevent filter injection */
export function sanitizeSearchQuery(input: string): string {
  // Escape characters that are special in PostgREST filter values
  return input.replace(/[%_\\(),."']/g, "");
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
