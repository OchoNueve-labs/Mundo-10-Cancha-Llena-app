"use client";

import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface BloquearSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: string | null;
  centro: string;
  tipoCancha: string;
  cancha: string;
  fecha: string;
  hora: string;
  duracion: number;
  onBlocked?: () => void;
}

export function BloquearSlotDialog({
  open,
  onOpenChange,
  slotId,
  centro,
  tipoCancha,
  cancha,
  fecha,
  hora,
  duracion,
  onBlocked,
}: BloquearSlotDialogProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleBloquear = async () => {
    setSaving(true);
    try {
      if (slotId && !slotId.startsWith("virtual-")) {
        // Slot exists in DB — update it
        const { error } = await supabase
          .from("slots")
          .update({
            estado: "bloqueado",
            notas: motivo || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", slotId);

        if (error) throw error;
      } else {
        // Slot doesn't exist yet — insert it
        const { error } = await supabase.from("slots").insert({
          centro,
          tipo_cancha: tipoCancha,
          cancha,
          fecha,
          hora: `${hora}:00`,
          duracion,
          estado: "bloqueado",
          notas: motivo || null,
        });

        if (error) throw error;
      }

      toast({
        title: "Slot bloqueado",
        description: `${cancha} a las ${hora} el ${fecha}`,
      });
      setMotivo("");
      onOpenChange(false);
      onBlocked?.();
    } catch (err) {
      toast({
        title: "Error al bloquear",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-slate-400" />
            Bloquear Horario
          </DialogTitle>
          <DialogDescription>
            Este horario no estara disponible para reservas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Cancha</span>
              <p className="font-medium text-foreground">{cancha}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hora</span>
              <p className="font-medium text-foreground">{hora}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha</span>
              <p className="font-medium text-foreground">{fecha}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Centro</span>
              <p className="font-medium text-foreground">{centro}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Mantenimiento, evento privado..."
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleBloquear}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-500 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Bloquear
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
