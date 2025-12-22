"use client";
import * as React from "react";
import { addMinutes, format, setHours, setMinutes, parse } from "date-fns";
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
import AutocompletePaciente from "@/components/AutocompletePaciente";
import { useTiposTurno } from "@/hooks/useTipoTurnos";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

// Configuración del consultorio (MVP)
const workingDays = [1, 2, 3, 4, 5]; // Lunes a Viernes
const workingHours = {
  start: "10:00",
  end: "18:00",
  interval: 30,
};

function generateTimeSlots(date: Date | undefined): string[] {
  if (!date) return [];

  const day = date.getDay();
  if (!workingDays.includes(day)) return [];

  const [startH, startM] = workingHours.start.split(":").map(Number);
  const [endH, endM] = workingHours.end.split(":").map(Number);

  const start = setMinutes(setHours(new Date(), startH), startM);
  const end = setMinutes(setHours(new Date(), endH), endM);

  const slots: string[] = [];
  let current = start;

  while (current <= end) {
    slots.push(format(current, "HH:mm"));
    current = addMinutes(current, workingHours.interval);
  }

  return slots;
}

type Props = {
  profesionalId: string;
};

export default function QuickAppointment({ profesionalId }: Props) {
  const queryClient = useQueryClient();

  const { data: tiposTurno = [] } = useTiposTurno();

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);

  const [paciente, setPaciente] = React.useState<any>(null);
  const [tipoTurnoId, setTipoTurnoId] = React.useState<string>("");
  const [observaciones, setObservaciones] = React.useState("");

  const availableHours = generateTimeSlots(date);

  const tipoTurnoSeleccionado = tiposTurno.find((t) => t.id === tipoTurnoId);

  async function confirmarTurno() {
    if (!paciente || !tipoTurnoId || !date || !selectedTime) {
      alert("Completá paciente, tipo de turno, fecha y horario.");
      return;
    }

    const inicio = parse(
      `${format(date, "yyyy-MM-dd")} ${selectedTime}`,
      "yyyy-MM-dd HH:mm",
      new Date()
    );

    await api.post("/turnos", {
      pacienteId: paciente.id,
      profesionalId,
      tipoTurnoId,
      inicio: inicio.toISOString(),
      observaciones,
    });

    // Refrescar calendario y upcoming
    queryClient.invalidateQueries({ queryKey: ["turnos", "rango"] });
    queryClient.invalidateQueries({ queryKey: ["turnos", "upcoming"] });

    // Reset
    setOpen(false);
    setSelectedTime(null);
    setPaciente(null);
    setTipoTurnoId("");
    setObservaciones("");
  }

  return (
    <>
      {/* Tarjeta principal */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mt-8">
        <CardContent className="flex flex-col md:flex-row gap-4 p-4 md:p-6">
          {/* Calendario */}
          <div className="w-full md:w-[60%] flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setSelectedTime(null);
              }}
              locale={es}
              disabled={(d) => !workingDays.includes(d.getDay())}
              className="rounded-md border border-gray-100"
            />
          </div>

          {/* Horarios */}
          <div className="w-full md:w-[40%] flex flex-col gap-2 overflow-y-auto max-h-[293px] pr-2">
            {availableHours.length === 0 ? (
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
          <span>Seleccioná un horario disponible para reservar un turno</span>

          <Button
            onClick={() => {
              if (!date || !selectedTime)
                return alert("Seleccioná fecha y hora");
              setOpen(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Continuar
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={confirmarTurno}
            >
              Confirmar turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
