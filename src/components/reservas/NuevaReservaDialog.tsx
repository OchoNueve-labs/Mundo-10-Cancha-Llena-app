"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2 } from "lucide-react";
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
import { CENTROS, type CentroName, type TipoCancha } from "@/lib/constants";
import { generateTimeSlots, validateRut, validateEmail } from "@/lib/utils";

export interface NuevaReservaInitial {
  centro?: CentroName;
  tipo_cancha?: TipoCancha;
  cancha?: string;
  fecha?: string;
  hora?: string;
  nombre_cliente?: string;
  telefono_cliente?: string;
  rut_cliente?: string;
  email_cliente?: string;
  notas?: string;
  duracion?: number;
}

interface NuevaReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: NuevaReservaInitial;
  editReservaId?: string | null;
  onCreated?: () => void;
  onUpdated?: () => void;
}

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calculate the N consecutive slot times needed for a given duration */
function getConsecutiveSlotTimes(
  startHora: string,
  duracion: number,
  intervalo: number
): string[] {
  const slotsNeeded = duracion / intervalo;
  const [h, m] = startHora.split(":").map(Number);
  const startMin = h * 60 + m;
  const times: string[] = [];
  for (let i = 0; i < slotsNeeded; i++) {
    const totalMin = startMin + i * intervalo;
    const hh = Math.floor(totalMin / 60)
      .toString()
      .padStart(2, "0");
    const mm = (totalMin % 60).toString().padStart(2, "0");
    times.push(`${hh}:${mm}`);
  }
  return times;
}

export function NuevaReservaDialog({
  open,
  onOpenChange,
  initialData,
  editReservaId,
  onCreated,
  onUpdated,
}: NuevaReservaDialogProps) {
  const isEditing = !!editReservaId;
  const supabase = createClient();
  const { toast } = useToast();

  // Form state
  const [centro, setCentro] = useState<CentroName>(
    initialData?.centro || "Lo Prado"
  );
  const [tipoCancha, setTipoCancha] = useState<TipoCancha>(
    initialData?.tipo_cancha || "Futbolito"
  );
  const [cancha, setCancha] = useState(initialData?.cancha || "");
  const [fecha, setFecha] = useState(initialData?.fecha || todayStr());
  const [hora, setHora] = useState(initialData?.hora || "");
  const [duracion, setDuracion] = useState(60);
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [rutCliente, setRutCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [notas, setNotas] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [horasOcupadas, setHorasOcupadas] = useState<Set<string>>(new Set());
  const [loadingHoras, setLoadingHoras] = useState(false);

  // Reset form when dialog opens with new initialData
  useEffect(() => {
    if (open) {
      setCentro(initialData?.centro || "Lo Prado");
      setTipoCancha(initialData?.tipo_cancha || "Futbolito");
      setCancha(initialData?.cancha || "");
      setFecha(initialData?.fecha || todayStr());
      setHora(initialData?.hora || "");
      setDuracion(initialData?.duracion || 60);
      setNombreCliente(initialData?.nombre_cliente || "");
      setTelefonoCliente(initialData?.telefono_cliente || "");
      setRutCliente(initialData?.rut_cliente || "");
      setEmailCliente(initialData?.email_cliente || "");
      setNotas(initialData?.notas || "");
    }
  }, [open, initialData]);

  // Derived: tipos disponibles para el centro seleccionado
  const tiposDisponibles = useMemo(() => {
    return CENTROS[centro].canchas.map((c) => c.tipo);
  }, [centro]);

  // Derived: config de cancha para centro + tipo
  const canchaConfig = useMemo(() => {
    return CENTROS[centro].canchas.find((c) => c.tipo === tipoCancha);
  }, [centro, tipoCancha]);

  // Derived: duraciones disponibles (undefined = single fixed duration)
  const duracionesDisponibles = useMemo(() => {
    if (!canchaConfig) return undefined;
    return "duraciones" in canchaConfig
      ? (canchaConfig as { duraciones: readonly number[] }).duraciones
      : undefined;
  }, [canchaConfig]);

  // Derived: nombres de canchas
  const canchaNames = useMemo((): string[] => {
    return canchaConfig ? Array.from(canchaConfig.nombres) : [];
  }, [canchaConfig]);

  // Derived: todos los time slots posibles
  const allTimeSlots = useMemo(() => {
    if (!canchaConfig) return [];
    return generateTimeSlots(
      canchaConfig.horario.inicio,
      canchaConfig.horario.fin,
      canchaConfig.intervalo
    );
  }, [canchaConfig]);

  // Derived: time slots disponibles (filtrado por ocupados y slots consecutivos)
  const horasDisponibles = useMemo(() => {
    if (!canchaConfig) return [];
    const intervalo = canchaConfig.intervalo;
    const slotsNeeded = duracion / intervalo;

    return allTimeSlots.filter((h) => {
      // Check that this start time + N consecutive slots are all available
      const consecutiveSlots = getConsecutiveSlotTimes(h, duracion, intervalo);
      // All consecutive slots must exist in allTimeSlots and not be occupied
      return consecutiveSlots.every(
        (slotTime) =>
          allTimeSlots.includes(slotTime) && !horasOcupadas.has(slotTime)
      );
    });
  }, [allTimeSlots, horasOcupadas, canchaConfig, duracion]);

  // Reset tipo_cancha si no esta disponible en el centro
  useEffect(() => {
    if (!tiposDisponibles.includes(tipoCancha)) {
      setTipoCancha(tiposDisponibles[0]);
    }
  }, [centro, tiposDisponibles, tipoCancha]);

  // Reset cancha si no esta disponible en el tipo
  useEffect(() => {
    if (cancha && !canchaNames.includes(cancha)) {
      setCancha("");
    }
  }, [canchaNames, cancha]);

  // Reset duracion when tipo changes and duraciones are not available
  useEffect(() => {
    if (!duracionesDisponibles) {
      setDuracion(canchaConfig?.intervalo ?? 60);
    } else if (!duracionesDisponibles.includes(duracion)) {
      setDuracion(duracionesDisponibles[0]);
    }
  }, [duracionesDisponibles, canchaConfig, duracion]);

  // Fetch horas ocupadas cuando cambia centro/tipo/cancha/fecha
  const fetchHorasOcupadas = useCallback(async () => {
    if (!cancha || !fecha) {
      setHorasOcupadas(new Set());
      return;
    }

    setLoadingHoras(true);
    let query = supabase
      .from("slots")
      .select("hora")
      .eq("centro", centro)
      .eq("tipo_cancha", tipoCancha)
      .eq("cancha", cancha)
      .eq("fecha", fecha)
      .neq("estado", "disponible");

    // When editing, exclude slots that belong to the current reservation
    if (editReservaId) {
      query = query.neq("reserva_id", editReservaId);
    }

    const { data } = await query;

    const ocupadas = new Set(
      (data || []).map((s: { hora: string }) => s.hora.substring(0, 5))
    );
    setHorasOcupadas(ocupadas);
    setLoadingHoras(false);
  }, [supabase, centro, tipoCancha, cancha, fecha, editReservaId]);

  useEffect(() => {
    if (open) {
      fetchHorasOcupadas();
    }
  }, [open, fetchHorasOcupadas]);

  // Reset hora si ya no esta disponible
  useEffect(() => {
    if (hora && !horasDisponibles.includes(hora)) {
      setHora("");
    }
  }, [horasDisponibles, hora]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validacion
    if (!centro || !tipoCancha || !cancha || !fecha || !hora) {
      toast({
        title: "Campos incompletos",
        description: "Completa centro, cancha, fecha y hora.",
        variant: "destructive",
      });
      return;
    }

    if (!nombreCliente || nombreCliente.trim().length < 2) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del cliente (minimo 2 caracteres).",
        variant: "destructive",
      });
      return;
    }

    if (!telefonoCliente || telefonoCliente.trim().length < 8) {
      toast({
        title: "Telefono requerido",
        description: "Ingresa un numero de telefono valido.",
        variant: "destructive",
      });
      return;
    }

    if (!rutCliente || !validateRut(rutCliente.trim())) {
      toast({
        title: "RUT invalido",
        description: "Ingresa un RUT chileno valido (ej: 12345678-9). Se verifica el digito verificador.",
        variant: "destructive",
      });
      return;
    }

    if (!emailCliente || !validateEmail(emailCliente.trim())) {
      toast({
        title: "Email invalido",
        description: "Ingresa un email valido (ej: cliente@email.com).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const intervalo = canchaConfig?.intervalo ?? 60;
    const slotTimes = getConsecutiveSlotTimes(hora, duracion, intervalo);

    try {
      if (isEditing) {
        // --- EDIT MODE ---
        // 1. Free old slots
        await supabase
          .from("slots")
          .update({
            estado: "disponible",
            reserva_id: null,
            origen: null,
            cliente_nombre: null,
            cliente_telefono: null,
            updated_at: new Date().toISOString(),
          })
          .eq("reserva_id", editReservaId);

        // 2. Verify new slots are available
        const { data: slotChecks } = await supabase
          .from("slots")
          .select("id, hora, estado")
          .eq("centro", centro)
          .eq("tipo_cancha", tipoCancha)
          .eq("cancha", cancha)
          .eq("fecha", fecha)
          .in("hora", slotTimes.map((t) => `${t}:00`));

        const unavailable = (slotChecks || []).filter(
          (s: { estado: string }) => s.estado !== "disponible"
        );
        if (unavailable.length > 0 || (slotChecks || []).length < slotTimes.length) {
          // Rollback: re-lock old slots (best effort — realtime will fix)
          toast({
            title: "Horario no disponible",
            description: "Selecciona otro horario. Los slots fueron ocupados.",
            variant: "destructive",
          });
          setLoading(false);
          fetchHorasOcupadas();
          return;
        }

        // 3. Update reserva
        const { error: updateReservaError } = await supabase
          .from("reservas")
          .update({
            centro,
            tipo_cancha: tipoCancha,
            cancha,
            fecha,
            hora: `${hora}:00`,
            duracion,
            nombre_cliente: nombreCliente.trim(),
            telefono_cliente: telefonoCliente.trim(),
            rut_cliente: rutCliente.trim(),
            email_cliente: emailCliente.trim(),
            notas: notas.trim() || null,
          })
          .eq("id", editReservaId);

        if (updateReservaError) {
          toast({
            title: "Error al actualizar reserva",
            description: updateReservaError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // 4. Lock new slots
        await supabase
          .from("slots")
          .update({
            estado: "reservado",
            reserva_id: editReservaId,
            origen: "dashboard",
            cliente_nombre: nombreCliente.trim(),
            cliente_telefono: telefonoCliente.trim(),
            cliente_rut: rutCliente.trim(),
            cliente_email: emailCliente.trim(),
            notas: notas.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("centro", centro)
          .eq("tipo_cancha", tipoCancha)
          .eq("cancha", cancha)
          .eq("fecha", fecha)
          .in("hora", slotTimes.map((t) => `${t}:00`));

        const durLabel = duracion > 60 ? ` (${duracion} min)` : "";
        toast({
          title: "Reserva actualizada",
          description: `${cancha} a las ${hora}${durLabel} para ${nombreCliente.trim()}`,
        });

        onOpenChange(false);
        onUpdated?.();
      } else {
        // --- CREATE MODE ---
        // Verificar que todos los slots consecutivos siguen disponibles
        const { data: slotChecks } = await supabase
          .from("slots")
          .select("id, hora, estado")
          .eq("centro", centro)
          .eq("tipo_cancha", tipoCancha)
          .eq("cancha", cancha)
          .eq("fecha", fecha)
          .in(
            "hora",
            slotTimes.map((t) => `${t}:00`)
          );

        const unavailable = (slotChecks || []).filter(
          (s: { estado: string }) => s.estado !== "disponible"
        );
        if (unavailable.length > 0) {
          toast({
            title: "Horario no disponible",
            description:
              "Uno o mas slots fueron reservados por alguien mas. Selecciona otro horario.",
            variant: "destructive",
          });
          setLoading(false);
          fetchHorasOcupadas();
          return;
        }

        if ((slotChecks || []).length < slotTimes.length) {
          toast({
            title: "Slots insuficientes",
            description:
              "No existen suficientes slots para la duracion seleccionada en este horario.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // 1. Crear reserva
        const { data: newReserva, error: insertError } = await supabase
          .from("reservas")
          .insert({
            centro,
            tipo_cancha: tipoCancha,
            cancha,
            fecha,
            hora: `${hora}:00`,
            duracion,
            nombre_cliente: nombreCliente.trim(),
            telefono_cliente: telefonoCliente.trim(),
            rut_cliente: rutCliente.trim(),
            email_cliente: emailCliente.trim(),
            estado: "pendiente",
            canal_origen: "dashboard",
            origen: "dashboard",
            notas: notas.trim() || null,
          })
          .select()
          .single();

        if (insertError) {
          toast({
            title: "Error al crear reserva",
            description: insertError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // 2. Actualizar todos los slots consecutivos
        const { error: updateError } = await supabase
          .from("slots")
          .update({
            estado: "reservado",
            reserva_id: String(newReserva.id),
            origen: "dashboard",
            cliente_nombre: nombreCliente.trim(),
            cliente_telefono: telefonoCliente.trim(),
            cliente_rut: rutCliente.trim(),
            cliente_email: emailCliente.trim(),
            notas: notas.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("centro", centro)
          .eq("tipo_cancha", tipoCancha)
          .eq("cancha", cancha)
          .eq("fecha", fecha)
          .in(
            "hora",
            slotTimes.map((t) => `${t}:00`)
          );

        if (updateError) {
          // Rollback: borrar la reserva creada
          await supabase.from("reservas").delete().eq("id", newReserva.id);
          toast({
            title: "Error al actualizar disponibilidad",
            description: updateError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const durLabel = duracion > 60 ? ` (${duracion} min)` : "";
        toast({
          title: "Reserva creada",
          description: `${cancha} a las ${hora}${durLabel} para ${nombreCliente.trim()}`,
        });

        onOpenChange(false);
        onCreated?.();
      }
    } catch {
      toast({
        title: "Error inesperado",
        description: isEditing
          ? "No se pudo actualizar la reserva. Intenta nuevamente."
          : "No se pudo crear la reserva. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    "w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const inputClass = selectClass;
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Reserva" : "Nueva Reserva"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la reserva existente."
              : "Completa los datos para crear una nueva reserva."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Centro y Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Centro</label>
              <select
                value={centro}
                onChange={(e) => setCentro(e.target.value as CentroName)}
                className={selectClass}
              >
                {(Object.keys(CENTROS) as CentroName[]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Tipo cancha</label>
              <select
                value={tipoCancha}
                onChange={(e) => setTipoCancha(e.target.value as TipoCancha)}
                className={selectClass}
              >
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cancha y Duracion */}
          <div
            className={
              duracionesDisponibles ? "grid grid-cols-2 gap-3" : undefined
            }
          >
            <div>
              <label className={labelClass}>Cancha</label>
              <select
                value={cancha}
                onChange={(e) => setCancha(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccionar cancha...</option>
                {canchaNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {duracionesDisponibles && (
              <div>
                <label className={labelClass}>Duracion</label>
                <select
                  value={duracion}
                  onChange={(e) => setDuracion(Number(e.target.value))}
                  className={selectClass}
                >
                  {duracionesDisponibles.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={todayStr()}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Hora
                {loadingHoras && (
                  <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                )}
              </label>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={selectClass}
                disabled={!cancha}
              >
                <option value="">
                  {!cancha
                    ? "Selecciona cancha primero"
                    : horasDisponibles.length === 0
                      ? "Sin horarios disponibles"
                      : "Seleccionar hora..."}
                </option>
                {horasDisponibles.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre cliente</label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Juan Perez"
                maxLength={100}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Telefono</label>
              <input
                type="tel"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                placeholder="+56912345678"
                maxLength={20}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>RUT</label>
              <input
                type="text"
                value={rutCliente}
                onChange={(e) => setRutCliente(e.target.value)}
                placeholder="12345678-9"
                maxLength={12}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                maxLength={254}
                className={inputClass}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Footer */}
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading
                ? isEditing ? "Guardando..." : "Creando..."
                : isEditing ? "Guardar Cambios" : "Crear Reserva"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
