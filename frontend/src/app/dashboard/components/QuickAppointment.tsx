"use client";
import * as React from "react";
import { addMinutes, format, setHours, setMinutes, parse, isBefore, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Scissors } from "lucide-react";
import { toast } from "sonner";
import AutocompletePaciente from "@/components/AutocompletePaciente";
import { useTiposTurno } from "@/hooks/useTipoTurnos";
import { useAgenda } from "@/hooks/useAgenda";
import { useTurnosRango, TurnoRango } from "@/hooks/useTurnosRangos";
import type { AgendaConfig } from "@/hooks/useProfesionalMe";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import SurgeryAppointmentModal from "@/app/dashboard/turnos/SurgeryAppointmentModal";

// Helpers para validar disponibilidad
function isDayBlocked(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda?.diasBloqueados) return false;
  const dateStr = format(date, "yyyy-MM-dd");
  return agenda.diasBloqueados.some((d) => {
    if (d.fechaFin) {
      return dateStr >= d.fecha && dateStr <= d.fechaFin;
    }
    return d.fecha === dateStr;
  });
}

function isSurgeryDay(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda?.diasCirugia) return false;
  const dateStr = format(date, "yyyy-MM-dd");
  return agenda.diasCirugia.some((d) => d.fecha === dateStr);
}

function isWorkingDay(date: Date, agenda: AgendaConfig | null): boolean {
  // Los días de cirugía siempre son "laborales" (para poder agendar cirugías)
  if (isSurgeryDay(date, agenda)) return true;

  if (!agenda?.horariosTrabajo) return true; // Sin config = todos los días
  const dayOfWeek = date.getDay();
  const dayConfig = agenda.horariosTrabajo[dayOfWeek];
  return dayConfig?.activo ?? false;
}

function generateTimeSlots(
  date: Date | undefined,
  agenda: AgendaConfig | null,
  interval: number = 30
): string[] {
  if (!date) return [];

  const dateStr = format(date, "yyyy-MM-dd");

  // Si es día de cirugía, usar los horarios de cirugía
  const surgeryConfig = agenda?.diasCirugia?.find((d) => d.fecha === dateStr);
  if (surgeryConfig) {
    const slots: string[] = [];
    const [startH, startM] = surgeryConfig.inicio.split(":").map(Number);
    const [endH, endM] = surgeryConfig.fin.split(":").map(Number);

    let current = setMinutes(setHours(new Date(), startH), startM);
    const end = setMinutes(setHours(new Date(), endH), endM);

    while (current < end) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, interval);
    }
    return slots;
  }

  // Si no hay configuración de horarios, no mostrar slots
  if (!agenda?.horariosTrabajo) return [];

  const dayOfWeek = date.getDay();
  const dayConfig = agenda.horariosTrabajo[dayOfWeek];

  if (!dayConfig?.activo || !dayConfig.bloques?.length) return [];

  const slots: string[] = [];

  // Generar slots para cada bloque de horario
  for (const bloque of dayConfig.bloques) {
    const [startH, startM] = bloque.inicio.split(":").map(Number);
    const [endH, endM] = bloque.fin.split(":").map(Number);

    let current = setMinutes(setHours(new Date(), startH), startM);
    const end = setMinutes(setHours(new Date(), endH), endM);

    while (current < end) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, interval);
    }
  }

  return slots;
}

// Filtrar slots que ya tienen turnos
function filterAvailableSlots(
  slots: string[],
  turnos: TurnoRango[],
  selectedDate: Date,
  duracionMinutos: number = 30
): string[] {
  if (!turnos.length) return slots;

  // Filtrar turnos activos (no cancelados ni ausentes)
  const turnosActivos = turnos.filter(
    (t) => t.estado !== "CANCELADO" && t.estado !== "AUSENTE"
  );

  return slots.filter((slotTime) => {
    const [slotH, slotM] = slotTime.split(":").map(Number);
    const slotStart = setMinutes(
      setHours(new Date(selectedDate), slotH),
      slotM
    );
    const slotEnd = addMinutes(slotStart, duracionMinutos);

    // Verificar si algún turno se solapa con este slot
    const hasOverlap = turnosActivos.some((turno) => {
      const turnoStart = new Date(turno.inicio);
      const turnoEnd = new Date(turno.fin);

      // Hay solapamiento si:
      // - El slot empieza antes de que termine el turno Y
      // - El slot termina después de que empiece el turno
      return isBefore(slotStart, turnoEnd) && isAfter(slotEnd, turnoStart);
    });

    return !hasOverlap;
  });
}

type Props = {
  profesionalId: string;
};

export default function QuickAppointment({ profesionalId }: Props) {
  const queryClient = useQueryClient();

  const { data: tiposTurno = [] } = useTiposTurno();
  const { data: agenda } = useAgenda(profesionalId);

  const [open, setOpen] = React.useState(false);
  const [surgeryModalOpen, setSurgeryModalOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [paciente, setPaciente] = React.useState<any>(null);
  const [tipoTurnoId, setTipoTurnoId] = React.useState<string>("");
  const [observaciones, setObservaciones] = React.useState("");
  const [duracionMinutos, setDuracionMinutos] = React.useState<number>(30);

  // Determinar si el día seleccionado es de cirugía
  const isSurgeryDaySelected = date ? isSurgeryDay(date, agenda ?? null) : false;

  const tipoTurnoSeleccionado = tiposTurno.find((t) => t.id === tipoTurnoId);

  // Actualizar duración cuando cambia el tipo de turno
  React.useEffect(() => {
    if (tipoTurnoSeleccionado) {
      setDuracionMinutos(tipoTurnoSeleccionado.duracionDefault || 30);
    }
  }, [tipoTurnoSeleccionado]);

  // Obtener turnos del día seleccionado para filtrar horarios ocupados
  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  const { data: turnosDelDia = [], isLoading: loadingTurnos } = useTurnosRango(
    profesionalId,
    selectedDateStr,
    selectedDateStr
  );

  // Generar slots y filtrar los ocupados usando la duración seleccionada
  const allSlots = generateTimeSlots(date, agenda ?? null);
  const availableHours = date
    ? filterAvailableSlots(allSlots, turnosDelDia, date, duracionMinutos)
    : [];

  async function confirmarTurno() {
    if (!paciente || !tipoTurnoId || !date || !selectedTime) {
      toast.error("Completá paciente, tipo de turno, fecha y horario.");
      return;
    }

    const inicio = parse(
      `${format(date, "yyyy-MM-dd")} ${selectedTime}`,
      "yyyy-MM-dd HH:mm",
      new Date()
    );

    setIsSubmitting(true);

    try {
      await api.post("/turnos", {
        pacienteId: paciente.id,
        profesionalId,
        tipoTurnoId,
        inicio: inicio.toISOString(),
        duracionMinutos,
        observaciones,
      });

      // Refrescar calendario y upcoming
      queryClient.invalidateQueries({ queryKey: ["turnos", "rango"] });
      queryClient.invalidateQueries({ queryKey: ["turnos", "upcoming"] });

      toast.success("Turno creado correctamente");

      // Reset
      setOpen(false);
      setSelectedTime(null);
      setPaciente(null);
      setTipoTurnoId("");
      setObservaciones("");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Error al crear el turno. Intentá nuevamente.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Tarjeta principal */}
      <Card className="bg-white border-0 shadow-none rounded-none overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-4">
          {/* Calendario */}
          <div className="w-full flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setSelectedTime(null);
              }}
              locale={es}
              disabled={(d) => {
                // Deshabilitar días pasados
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (d < today) return true;
                // Deshabilitar días no laborales
                if (!isWorkingDay(d, agenda ?? null)) return true;
                // Deshabilitar días bloqueados
                if (isDayBlocked(d, agenda ?? null)) return true;
                return false;
              }}
              modifiers={{
                cirugia: (d) => isSurgeryDay(d, agenda ?? null),
                bloqueado: (d) => isDayBlocked(d, agenda ?? null),
              }}
              modifiersStyles={{
                cirugia: {
                  backgroundColor: "#FEF9C3",
                  color: "#854D0E",
                  fontWeight: "bold",
                },
                bloqueado: {
                  backgroundColor: "#FEE2E2",
                  color: "#991B1B",
                  fontWeight: "bold",
                },
              }}
              className="rounded-md border border-gray-100"
            />
          </div>

          {/* Horarios */}
          <div className="w-full grid grid-cols-3 gap-2 overflow-y-auto max-h-[200px] pr-2">
            {loadingTurnos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : availableHours.length === 0 ? (
              <p className="text-sm text-gray-500 px-2">
                No hay horarios disponibles para este día.
              </p>
            ) : (
              availableHours.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  className={`w-full justify-center ${
                    selectedTime === time ? "bg-indigo-500 text-white" : ""
                  }`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between p-4 border-t text-sm text-gray-600">
          <span>
            {isSurgeryDaySelected ? (
              <span className="text-yellow-700 font-medium">
                Día de cirugía - Solo turnos de cirugía disponibles
              </span>
            ) : (
              "Seleccioná un horario disponible para reservar un turno"
            )}
          </span>

          <Button
            onClick={() => {
              if (!date || !selectedTime) {
                toast.warning("Seleccioná fecha y hora");
                return;
              }
              // Si es día de cirugía, abrir modal de cirugía
              if (isSurgeryDaySelected) {
                setSurgeryModalOpen(true);
              } else {
                setOpen(true);
              }
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {isSurgeryDaySelected ? (
              <>
                <Scissors className="w-4 h-4 mr-2" />
                Programar cirugía
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar nuevo turno</DialogTitle>
            <DialogDescription>
              Seleccioná el paciente y tipo de turno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Paciente */}
            <AutocompletePaciente
              onSelect={(p) => setPaciente(p)}
              value={paciente?.nombreCompleto}
              avatarUrl={paciente?.fotoUrl}
            />

            {/* Tipo de turno */}
            <div className="grid gap-2">
              <Label>Tipo de turno</Label>
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={tipoTurnoId}
                onChange={(e) => setTipoTurnoId(e.target.value)}
              >
                <option value="">Seleccionar tipo</option>
                {tiposTurno.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Observaciones */}
            <div className="grid gap-2">
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Notas adicionales (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            {/* Resumen */}
            <div className="text-sm text-gray-500 mt-2">
              <strong>Fecha:</strong> {date ? format(date, "dd/MM/yyyy") : "—"}
              <br />
              <strong>Hora:</strong> {selectedTime || "—"}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={confirmarTurno}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de cirugía */}
      <SurgeryAppointmentModal
        open={surgeryModalOpen}
        onOpenChange={setSurgeryModalOpen}
        defaultDate={date}
      />
    </>
  );
}
