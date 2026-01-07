"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  Clock,
  User,
  Stethoscope,
  FileText,
  CalendarClock,
  Loader2,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useReprogramarTurno } from "@/hooks/useReprogramarTurnos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CalendarEvent {
  id: string;
  title: string;
  paciente: string;
  start: Date;
  end: Date;
  tipo: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  observaciones?: string;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onRescheduleSuccess?: () => void;
};

function getEstadoBadge(estado: CalendarEvent["estado"]) {
  switch (estado) {
    case "CONFIRMADO":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmado</Badge>;
    case "PENDIENTE":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pendiente</Badge>;
    case "FINALIZADO":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Finalizado</Badge>;
    case "AUSENTE":
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Ausente</Badge>;
    case "CANCELADO":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

export default function AppointmentDetailModal({
  open,
  onOpenChange,
  event,
  onRescheduleSuccess,
}: Props) {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState("");

  const queryClient = useQueryClient();
  const reprogramar = useReprogramarTurno();

  const confirmarMutation = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.patch(`/turnos/${turnoId}/confirmar`);
      return data;
    },
    onSuccess: () => {
      toast.success("Turno confirmado");
      queryClient.invalidateQueries({ queryKey: ["turnos"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Error al confirmar el turno");
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.patch(`/turnos/${turnoId}/cancelar`);
      return data;
    },
    onSuccess: () => {
      toast.success("Turno cancelado");
      queryClient.invalidateQueries({ queryKey: ["turnos"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Error al cancelar el turno");
    },
  });

  if (!event) return null;

  const canReschedule = event.estado !== "CANCELADO" && event.estado !== "FINALIZADO";

  const handleStartReschedule = () => {
    setNewDate(event.start);
    setNewTime(format(event.start, "HH:mm"));
    setIsRescheduling(true);
  };

  const handleCancelReschedule = () => {
    setIsRescheduling(false);
    setNewDate(undefined);
    setNewTime("");
  };

  const handleConfirmReschedule = () => {
    if (!newDate || !newTime) {
      toast.error("Seleccioná fecha y hora");
      return;
    }

    const [hours, minutes] = newTime.split(":").map(Number);
    const newStart = new Date(newDate);
    newStart.setHours(hours, minutes, 0, 0);

    // Calculate duration from original event
    const durationMs = event.end.getTime() - event.start.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    reprogramar.mutate(
      { id: event.id, inicio: newStart, fin: newEnd },
      {
        onSuccess: () => {
          toast.success("Turno reprogramado correctamente");
          setIsRescheduling(false);
          onRescheduleSuccess?.();
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message ?? "No se pudo reprogramar el turno"
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalle del turno</span>
            {getEstadoBadge(event.estado)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Paciente */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">{event.paciente}</p>
            </div>
          </div>

          {/* Tipo de turno */}
          <div className="flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Tipo de turno</p>
              <p className="font-medium">{event.tipo}</p>
            </div>
          </div>

          {/* Fecha */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium capitalize">
                {format(event.start, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          </div>

          {/* Horario */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Horario</p>
              <p className="font-medium">
                {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")} hs
              </p>
            </div>
          </div>

          {/* Observaciones */}
          {event.observaciones && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Observaciones</p>
                <p className="text-sm">{event.observaciones}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Status Actions */}
          {canReschedule && !isRescheduling && (
            <div className="space-y-3">
              {/* Confirm / Cancel buttons */}
              <div className="flex gap-2">
                {event.estado !== "CONFIRMADO" && (
                  <Button
                    variant="outline"
                    className="flex-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                    onClick={() => confirmarMutation.mutate(event.id)}
                    disabled={confirmarMutation.isPending || cancelarMutation.isPending}
                  >
                    {confirmarMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirmar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => cancelarMutation.mutate(event.id)}
                  disabled={confirmarMutation.isPending || cancelarMutation.isPending}
                >
                  {cancelarMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Cancelar
                </Button>
              </div>

              {/* Reschedule button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleStartReschedule}
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Reagendar turno
              </Button>
            </div>
          )}

          {isRescheduling && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Reagendar turno</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCancelReschedule}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nueva fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn("w-full justify-start text-left font-normal")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDate ? (
                          format(newDate, "dd/MM/yyyy", { locale: es })
                        ) : (
                          <span>Seleccionar</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={setNewDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Nueva hora</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={handleConfirmReschedule}
                disabled={reprogramar.isPending}
              >
                {reprogramar.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar reagendamiento
              </Button>
            </div>
          )}

          {!canReschedule && (
            <p className="text-sm text-muted-foreground text-center">
              No se puede reagendar un turno {event.estado.toLowerCase()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
