"use client";

import { useState } from "react";
import { Unlock, Loader2 } from "lucide-react";
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

interface DesbloquearSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: string;
  cancha: string;
  fecha: string;
  hora: string;
  notas: string | null;
  onUnblocked?: () => void;
}

export function DesbloquearSlotDialog({
  open,
  onOpenChange,
  slotId,
  cancha,
  fecha,
  hora,
  notas,
  onUnblocked,
}: DesbloquearSlotDialogProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleDesbloquear = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("slots")
        .update({
          estado: "disponible",
          notas: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", slotId);

      if (error) throw error;

      toast({
        title: "Slot desbloqueado",
        description: `${cancha} a las ${hora} el ${fecha}`,
      });
      onOpenChange(false);
      onUnblocked?.();
    } catch (err) {
      toast({
        title: "Error al desbloquear",
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
            <Unlock className="h-5 w-5 text-emerald-400" />
            Desbloquear Horario
          </DialogTitle>
          <DialogDescription>
            Este horario volvera a estar disponible para reservas.
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
          </div>

          {notas && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-xs text-muted-foreground block mb-1">Motivo del bloqueo</span>
              <p className="text-sm text-foreground">{notas}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDesbloquear}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Desbloquear
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
