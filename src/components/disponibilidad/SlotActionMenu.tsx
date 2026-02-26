"use client";

import { useEffect, useRef } from "react";
import { CalendarPlus, Ban } from "lucide-react";

interface SlotActionMenuProps {
  open: boolean;
  onClose: () => void;
  onReservar: () => void;
  onBloquear: () => void;
  anchorRect: { top: number; left: number; width: number; height: number } | null;
}

export function SlotActionMenu({
  open,
  onClose,
  onReservar,
  onBloquear,
  anchorRect,
}: SlotActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  // Position below the cell, centered horizontally
  const style: React.CSSProperties = {
    position: "fixed",
    top: anchorRect.top + anchorRect.height + 4,
    left: anchorRect.left + anchorRect.width / 2,
    transform: "translateX(-50%)",
    zIndex: 50,
  };

  return (
    <div ref={menuRef} style={style} className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <button
        onClick={() => { onReservar(); onClose(); }}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <CalendarPlus className="h-4 w-4 text-emerald-400" />
        Reservar
      </button>
      <button
        onClick={() => { onBloquear(); onClose(); }}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
      >
        <Ban className="h-4 w-4 text-slate-400" />
        Bloquear
      </button>
    </div>
  );
}
