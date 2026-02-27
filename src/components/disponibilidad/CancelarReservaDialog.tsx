"use client";

import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
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

interface CancelarReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservaId: string;
  cancha: string;
  hora: string;
  fecha: string;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  clienteRut: string | null;
  clienteEmail: string | null;
  duracionMin: number;
  origen: string | null;
  notas: string | null;
  onCancelled?: () => void;
  onModificar?: () => void;
}

export function CancelarReservaDialog({
  open,
  onOpenChange,
  reservaId,
  cancha,
  hora,
  fecha,
  clienteNombre,
  clienteTelefono,
  clienteRut,
  clienteEmail,
  duracionMin,
  origen,
  notas,
  onCancelled,
  onModificar,
}: CancelarReservaDialogProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleCancelar = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reservas")
        .update({ estado: "cancelada" })
        .eq("id", reservaId);

      if (error) throw error;

      // Free all slots linked to this reservation
      await supabase
        .from("slots")
        .update({
          estado: "disponible",
          reserva_id: null,
          origen: null,
          cliente_nombre: null,
          cliente_telefono: null,
          cliente_rut: null,
          cliente_email: null,
          updated_at: new Date().toISOString(),
        })
        .eq("reserva_id", reservaId);

      toast({
        title: "Reserva cancelada",
        description: `${cancha} a las ${hora} el ${fecha}`,
      });
      onOpenChange(false);
      onCancelled?.();
    } catch (err) {
      toast({
        title: "Error al cancelar",
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
            Detalle de Reserva
          </DialogTitle>
          <DialogDescription>
            Puedes modificar o cancelar esta reserva.
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
              <span className="text-muted-foreground">Duracion</span>
              <p className="font-medium text-foreground">{duracionMin} min</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente</span>
              <p className="font-medium text-foreground">
                {clienteNombre || "Sin nombre"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Telefono</span>
              <p className="font-medium text-foreground">
                {clienteTelefono || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">RUT</span>
              <p className="font-medium text-foreground">
                {clienteRut || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium text-foreground truncate">
                {clienteEmail || "—"}
              </p>
            </div>
          </div>

          {origen && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-xs text-muted-foreground block mb-1">
                Canal de origen
              </span>
              <p className="text-sm text-foreground">{origen}</p>
            </div>
          )}

          {notas && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-xs text-muted-foreground block mb-1">
                Notas
              </span>
              <p className="text-sm text-foreground">{notas}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Volver
          </button>
          <div className="flex gap-2">
            {onModificar && (
              <button
                onClick={onModificar}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Modificar
              </button>
            )}
            <button
              onClick={handleCancelar}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancelar Reserva
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
