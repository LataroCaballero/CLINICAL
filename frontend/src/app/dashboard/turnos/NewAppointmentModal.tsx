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
import { CalendarIcon, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import AutocompletePaciente from "@/components/AutocompletePaciente";

export type PacienteSuggest = {
  id: string;
  nombreCompleto: string;
  dni: string;
  telefono: string;
  fotoUrl: string | null;
  score: number;
};

export default function NewAppointmentModal({
  open,
  onOpenChange,
  selectedEvent,
}: any) {
  // --------------------------------------------------
  // 🎯 React Hook Form Setup
  // --------------------------------------------------
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      pacienteId: "",
      pacienteNombre: "",
      tipo: "",
      fecha: new Date(),
      hora: "",
      observaciones: "",
    },
  });

  // --------------------------------------------------
  // 🎯 Si es modo edición → precargar datos
  // --------------------------------------------------
  useEffect(() => {
    if (selectedEvent) {
      reset({
        pacienteId: selectedEvent.pacienteId || "",
        pacienteNombre: selectedEvent.paciente || "",
        tipo: selectedEvent.tipo || "",
        fecha: selectedEvent.fecha ? new Date(selectedEvent.fecha) : new Date(),
        hora: selectedEvent.hora || "",
        observaciones: selectedEvent.observaciones || "",
      });
    } else {
      reset({
        pacienteId: "",
        pacienteNombre: "",
        tipo: "",
        fecha: new Date(),
        hora: "",
        observaciones: "",
      });
    }
  }, [selectedEvent, reset]);

  const pacienteNombre = watch("pacienteNombre");
  const fecha = watch("fecha");

  // --------------------------------------------------
  // 🎯 Enviar form
  // --------------------------------------------------
  const onSubmit = (data: any) => {
    console.log("FORM FINAL:", data);
    // TODO: enviar al backend aquí
    onOpenChange(false);
  };

  const handleDelete = () => {
    console.log("Eliminar turno:", selectedEvent?.id);
    // TODO: endpoint delete turno
    onOpenChange(false);
  };

  const isEditMode = !!selectedEvent;

  // --------------------------------------------------
  // 📌 UI
  // --------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar turno" : "Nuevo turno"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Actualiza los datos del turno o envía un recordatorio."
              : "Completa los datos para agendar un nuevo turno."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Paciente */}
          <div>
            <Label>Paciente</Label>
            <div className="relative">
              <AutocompletePaciente
                value={pacienteNombre}
                avatarUrl={selectedEvent?.pacienteFotoUrl || null}
                onClear={() => {
                  setValue("pacienteId", "");
                  setValue("pacienteNombre", "");
                }}
                onSelect={(pac) => {
                  setValue("pacienteId", pac.id);
                  setValue("pacienteNombre", pac.nombreCompleto);
                  // Guardás la foto del paciente, si existe
                  setValue("pacienteFotoUrl", pac.fotoUrl || null);
                }}
              />
            </div>

            {pacienteNombre && (
              <p className="text-xs text-gray-500 mt-1">
                Seleccionado: {pacienteNombre}
              </p>
            )}
          </div>

          {/* Fecha + hora */}
          <div className="grid grid-cols-2 gap-3">
            {/* FECHA */}
            <div>
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fecha ? (
                      format(fecha, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(d) => setValue("fecha", d!)}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* HORA */}
            <div>
              <Label>Horario</Label>
              <Input type="time" {...register("hora")} />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <Label>Tipo de turno</Label>
            <Select defaultValue="" onValueChange={(v) => setValue("tipo", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primera">Primera vez</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="prequirurgico">Prequirúrgico</SelectItem>
                <SelectItem value="cirugia">Cirugía</SelectItem>
                <SelectItem value="tratamiento">Tratamiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observaciones */}
          <div>
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Detalles del procedimiento o notas adicionales..."
              {...register("observaciones")}
            />
          </div>

          <DialogFooter className="flex justify-between mt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>

              {isEditMode && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
            </div>

            <Button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {isEditMode ? "Guardar cambios" : "Guardar turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
