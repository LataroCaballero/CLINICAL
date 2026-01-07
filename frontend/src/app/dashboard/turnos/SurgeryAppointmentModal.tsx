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
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import AutocompletePaciente from "@/components/AutocompletePaciente";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { api } from "@/lib/api";

type TipoAnestesia = "LOCAL" | "SEDACION" | "GENERAL" | "REGIONAL" | "NINGUNA";

type FormValues = {
  pacienteId: string;
  pacienteNombre: string;
  fecha: Date;
  horaInicio: string;
  procedimiento: string;
  descripcion: string;
  tipoAnestesia: TipoAnestesia | "";
  quirofano: string;
  ayudante: string;
  anestesiologo: string;
  notasPreoperatorias: string;
  duracionMinutos: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
};

const TIPOS_ANESTESIA: { value: TipoAnestesia; label: string }[] = [
  { value: "LOCAL", label: "Local" },
  { value: "SEDACION", label: "Sedación" },
  { value: "GENERAL", label: "General" },
  { value: "REGIONAL", label: "Regional" },
  { value: "NINGUNA", label: "Ninguna" },
];

export default function SurgeryAppointmentModal({
  open,
  onOpenChange,
  defaultDate,
}: Props) {
  const qc = useQueryClient();
  const effectiveProfessionalId = useEffectiveProfessionalId();

  const [pacienteFotoUrl, setPacienteFotoUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      pacienteId: "",
      pacienteNombre: "",
      fecha: defaultDate || new Date(),
      horaInicio: "08:00",
      procedimiento: "",
      descripcion: "",
      tipoAnestesia: "",
      quirofano: "",
      ayudante: "",
      anestesiologo: "",
      notasPreoperatorias: "",
      duracionMinutos: 120,
    },
  });

  useEffect(() => {
    if (open && defaultDate) {
      setValue("fecha", defaultDate);
    }
  }, [open, defaultDate, setValue]);

  useEffect(() => {
    if (!open) {
      reset();
      setPacienteFotoUrl(null);
    }
  }, [open, reset]);

  const pacienteNombre = watch("pacienteNombre");
  const fecha = watch("fecha");
  const tipoAnestesia = watch("tipoAnestesia");

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        pacienteId: data.pacienteId,
        profesionalId: effectiveProfessionalId,
        fecha: format(data.fecha, "yyyy-MM-dd"),
        horaInicio: data.horaInicio,
        procedimiento: data.procedimiento,
        descripcion: data.descripcion || undefined,
        tipoAnestesia: data.tipoAnestesia || undefined,
        quirofano: data.quirofano || undefined,
        ayudante: data.ayudante || undefined,
        anestesiologo: data.anestesiologo || undefined,
        notasPreoperatorias: data.notasPreoperatorias || undefined,
        duracionMinutos: data.duracionMinutos || 120,
      };

      const { data: result } = await api.post("/turnos/cirugia", payload);
      return result;
    },
    onSuccess: () => {
      toast.success("Cirugía programada correctamente");
      qc.invalidateQueries({ queryKey: ["turnos"] });
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Error al programar la cirugía";
      toast.error(msg);
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!effectiveProfessionalId) {
      toast.error("Debe seleccionar un profesional");
      return;
    }

    if (!data.pacienteId) {
      toast.error("Debe seleccionar un paciente");
      return;
    }

    if (!data.procedimiento.trim()) {
      toast.error("Debe indicar el procedimiento");
      return;
    }

    if (!data.horaInicio) {
      toast.error("Debe seleccionar una hora de inicio");
      return;
    }

    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Programar cirugía
          </DialogTitle>
          <DialogDescription>
            Complete los datos para programar una nueva cirugía.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Paciente */}
          <div className="space-y-1">
            <Label>Paciente *</Label>
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

          {/* Procedimiento */}
          <div className="space-y-1">
            <Label>Procedimiento *</Label>
            <Input
              placeholder="Ej: Rinoplastia, Liposucción, etc."
              {...register("procedimiento")}
            />
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha *</Label>
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
              <Label>Hora de inicio *</Label>
              <Input type="time" {...register("horaInicio")} />
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-1">
            <Label>Duración estimada (minutos)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              {...register("duracionMinutos", { valueAsNumber: true })}
            />
          </div>

          {/* Tipo de anestesia */}
          <div className="space-y-1">
            <Label>Tipo de anestesia</Label>
            <Select
              value={tipoAnestesia}
              onValueChange={(v) => setValue("tipoAnestesia", v as TipoAnestesia)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ANESTESIA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quirófano y Equipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quirófano</Label>
              <Input placeholder="Ej: Quirófano 1" {...register("quirofano")} />
            </div>

            <div className="space-y-1">
              <Label>Anestesiólogo</Label>
              <Input placeholder="Nombre del anestesiólogo" {...register("anestesiologo")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Ayudante</Label>
            <Input placeholder="Nombre del ayudante" {...register("ayudante")} />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Descripción detallada del procedimiento"
              {...register("descripcion")}
              rows={2}
            />
          </div>

          {/* Notas preoperatorias */}
          <div className="space-y-1">
            <Label>Notas preoperatorias</Label>
            <Textarea
              placeholder="Indicaciones, preparación previa, ayuno, etc."
              {...register("notasPreoperatorias")}
              rows={2}
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

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Programar cirugía
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
