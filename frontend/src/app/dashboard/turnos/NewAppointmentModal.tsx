"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, Scissors } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import AutocompletePaciente from "@/components/AutocompletePaciente";
import { useTiposTurno } from "@/hooks/useTipoTurnos";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { api } from "@/lib/api";

type FormValues = {
  pacienteId: string;
  pacienteNombre: string;
  tipoTurnoId: string;
  fecha: Date;
  hora: string;
  observaciones: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSurgery?: () => void;
  selectedEvent?: {
    id?: string;
    pacienteId?: string;
    paciente?: string;
    pacienteFotoUrl?: string;
    tipoTurnoId?: string;
    fecha?: string;
    hora?: string;
    observaciones?: string;
  } | null;
};

export default function NewAppointmentModal({
  open,
  onOpenChange,
  onSwitchToSurgery,
  selectedEvent,
}: Props) {
  const qc = useQueryClient();
  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { data: tiposTurno = [], isLoading: loadingTipos } = useTiposTurno();

  const [pacienteFotoUrl, setPacienteFotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      pacienteId: "",
      pacienteNombre: "",
      tipoTurnoId: "",
      fecha: new Date(),
      hora: "",
      observaciones: "",
    },
  });

  const isEditMode = !!selectedEvent?.id;

  useEffect(() => {
    if (selectedEvent) {
      reset({
        pacienteId: selectedEvent.pacienteId || "",
        pacienteNombre: selectedEvent.paciente || "",
        tipoTurnoId: selectedEvent.tipoTurnoId || "",
        fecha: selectedEvent.fecha ? new Date(selectedEvent.fecha) : new Date(),
        hora: selectedEvent.hora || "",
        observaciones: selectedEvent.observaciones || "",
      });
      setPacienteFotoUrl(selectedEvent.pacienteFotoUrl || null);
    } else {
      reset({
        pacienteId: "",
        pacienteNombre: "",
        tipoTurnoId: "",
        fecha: new Date(),
        hora: "",
        observaciones: "",
      });
      setPacienteFotoUrl(null);
    }
  }, [selectedEvent, reset, open]);

  const pacienteNombre = watch("pacienteNombre");
  const fecha = watch("fecha");
  const tipoTurnoId = watch("tipoTurnoId");

  const onSubmit = async (data: FormValues) => {
    if (!effectiveProfessionalId) {
      toast.error("Debe seleccionar un profesional");
      return;
    }

    if (!data.pacienteId) {
      toast.error("Debe seleccionar un paciente");
      return;
    }

    if (!data.tipoTurnoId) {
      toast.error("Debe seleccionar un tipo de turno");
      return;
    }

    if (!data.hora) {
      toast.error("Debe seleccionar una hora");
      return;
    }

    // Combinar fecha + hora en ISO string
    const [hours, minutes] = data.hora.split(":").map(Number);
    const inicio = new Date(data.fecha);
    inicio.setHours(hours, minutes, 0, 0);

    setIsSubmitting(true);

    try {
      await api.post("/turnos", {
        pacienteId: data.pacienteId,
        profesionalId: effectiveProfessionalId,
        tipoTurnoId: data.tipoTurnoId,
        inicio: inicio.toISOString(),
        observaciones: data.observaciones || undefined,
      });

      toast.success("Turno creado correctamente");
      qc.invalidateQueries({ queryKey: ["turnos"] });
      onOpenChange(false);
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Error al crear el turno";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar turno" : "Nuevo turno"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Actualiza los datos del turno."
              : "Completa los datos para agendar un nuevo turno."}
          </DialogDescription>
        </DialogHeader>

        {/* Switch to surgery mode */}
        {!isEditMode && onSwitchToSurgery && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-yellow-400 text-yellow-700 hover:bg-yellow-50"
            onClick={() => {
              onOpenChange(false);
              onSwitchToSurgery();
            }}
          >
            <Scissors className="w-4 h-4 mr-2" />
            ¿Querés programar una cirugía?
          </Button>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Paciente */}
          <div className="space-y-1">
            <Label>Paciente</Label>
            <AutocompletePaciente
              value={pacienteNombre}
              avatarUrl={pacienteFotoUrl}
              onClear={() => {
                setValue("pacienteId", "");
                setValue("pacienteNombre", "");
                setPacienteFotoUrl(null);
              }}
              onSelect={(pac) => {
                setValue("pacienteId", pac.id);
                setValue("pacienteNombre", pac.nombreCompleto);
                setPacienteFotoUrl(pac.fotoUrl || null);
              }}
            />
          </div>

          {/* Tipo de turno */}
          <div className="space-y-1">
            <Label>Tipo de turno</Label>
            <Select
              value={tipoTurnoId}
              onValueChange={(v) => setValue("tipoTurnoId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {loadingTipos && (
                  <div className="flex justify-center p-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                  </div>
                )}
                {tiposTurno.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha + hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fecha ? (
                      format(fecha, "dd/MM/yyyy", { locale: es })
                    ) : (
                      <span>Seleccionar</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(d) => d && setValue("fecha", d)}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label>Hora</Label>
              <Input type="time" {...register("hora")} />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Notas adicionales (opcional)"
              {...register("observaciones")}
            />
          </div>

          <DialogFooter className="flex justify-between mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditMode ? "Guardar cambios" : "Crear turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
