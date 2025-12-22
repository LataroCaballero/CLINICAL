"use client";

import { useEffect, useMemo, useState } from "react";
import QuickAppointment from "../components/QuickAppointment";
import UpcomingAppointments from "../components/UpcomingAppointments";

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

import NewAppointmentModal from "./NewAppointmentModal";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import { toast } from "sonner";
import { useTurnosRango } from "@/hooks/useTurnosRangos";
import { useProfesionales } from "@/hooks/useProfesionales";
import { useReprogramarTurno } from "@/hooks/useReprogramarTurnos";

moment.locale("es");
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

type ViewType = "day" | "week" | "month";

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

// ---------------------------
// CONFIGURACIÓN DEL PROFESIONAL (UI)
// ---------------------------
const config = {
  workingDays: [1, 2, 3, 4, 5], // lun - vie
  surgeryDays: ["2025-11-15", "2025-11-20"],
  blockedDays: ["2025-11-18", "2025-11-25"],
  extraAvailableDays: ["2025-11-17"],
};

function isBlockedDay(start: Date) {
  const day = start.getDay();
  const dateStr = start.toISOString().slice(0, 10);

  return (
    config.blockedDays.includes(dateStr) ||
    (!config.workingDays.includes(day) &&
      !config.extraAvailableDays.includes(dateStr))
  );
}

export default function TurnosPage() {
  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(new Date());

  const [openModal, setOpenModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const { data: profesionales = [] } = useProfesionales();
  const [profesionalId, setProfesionalId] = useState<string>("");

  const reprogramar = useReprogramarTurno();

  // Default profesional
  useEffect(() => {
    if (!profesionalId && profesionales.length > 0) {
      setProfesionalId(profesionales[0].id);
    }
  }, [profesionales, profesionalId]);

  // Rango visible según view y date
  const desde = useMemo(
    () => moment(date).startOf(view).format("YYYY-MM-DD"),
    [date, view]
  );
  const hasta = useMemo(
    () => moment(date).endOf(view).format("YYYY-MM-DD"),
    [date, view]
  );

  const { data: turnosRango = [] } = useTurnosRango(
    profesionalId || undefined,
    desde,
    hasta
  );

  // Map turnos -> eventos
  useEffect(() => {
    const mapped: CalendarEvent[] = (turnosRango as any[]).map((t) => ({
      id: t.id,
      title: `${t.tipoTurno?.nombre ?? "Turno"} – ${
        t.paciente?.nombreCompleto ?? ""
      }`,
      paciente: t.paciente?.nombreCompleto ?? "",
      start: new Date(t.inicio),
      end: new Date(t.fin),
      tipo: t.tipoTurno?.nombre ?? "Turno",
      estado: t.estado,
      observaciones: t.observaciones ?? "",
    }));

    setEvents(mapped);
  }, [turnosRango]);

  // Optimistic update helper
  function updateEventTime(eventId: string, start: Date, end: Date) {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, start, end } : e))
    );
  }

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setOpenModal(true);
  };

  // DRAG & DROP: mover evento
  const handleEventMove = ({ event, start, end }: any) => {
    // bloqueos por estado
    if (event?.estado === "CANCELADO" || event?.estado === "FINALIZADO") {
      toast.error("No podés reprogramar un turno cancelado o finalizado.");
      return;
    }

    const prev = events; // snapshot
    updateEventTime(event.id, start, end);

    reprogramar.mutate(
      { id: event.id, inicio: start, fin: end },
      {
        onError: (err: any) => {
          setEvents(prev); // rollback
          toast.error(
            err?.response?.data?.message ??
              "No se pudo reprogramar: solapamiento o estado inválido."
          );
        },
        onSuccess: () => {
          toast.success("Turno reprogramado.");
        },
      }
    );
  };

  // RESIZE: redimensionar evento
  const handleEventResize = ({ event, start, end }: any) => {
    if (event?.estado === "CANCELADO" || event?.estado === "FINALIZADO") {
      toast.error("No podés reprogramar un turno cancelado o finalizado.");
      return;
    }

    const prev = events;
    updateEventTime(event.id, start, end);

    reprogramar.mutate(
      { id: event.id, inicio: start, fin: end },
      {
        onError: (err: any) => {
          setEvents(prev);
          toast.error(
            err?.response?.data?.message ??
              "No se pudo reprogramar: solapamiento o estado inválido."
          );
        },
        onSuccess: () => {
          toast.success("Turno actualizado.");
        },
      }
    );
  };

  // Nuevo turno al clickear slot
  const handleSelectSlot = ({ start }: any) => {
    if (isBlockedDay(start)) {
      toast.error("Ese día no está disponible");
      return;
    }
    setSelectedEvent(null);
    setOpenModal(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[100vw]">
      {/* PRIMERA FILA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!!profesionalId && <QuickAppointment profesionalId={profesionalId} />}
        <UpcomingAppointments profesionalId={profesionalId} />
      </div>

      {/* SEGUNDA FILA: CALENDARIO */}
      <Card className="p-4 shadow-sm">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-base font-medium text-gray-800">
            Agenda
          </CardTitle>

          <div className="flex gap-2 items-center">
            <Select value={profesionalId} onValueChange={setProfesionalId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Profesional" />
              </SelectTrigger>
              <SelectContent>
                {profesionales.map((p: any) => {
                  const label =
                    p.nombreCompleto ??
                    `${p.usuario?.nombre ?? ""} ${
                      p.usuario?.apellido ?? ""
                    }`.trim() ??
                    "Profesional";
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Vista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Día</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="default" onClick={() => setOpenModal(true)}>
              Nuevo turno
            </Button>
          </div>
        </CardHeader>

        <NewAppointmentModal
          open={openModal}
          onOpenChange={setOpenModal}
          selectedEvent={selectedEvent}
        />

        <CardContent>
          {/* Navegación */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDate(moment(date).subtract(1, view).toDate())}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button variant="outline" onClick={() => setDate(new Date())}>
                Hoy
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setDate(moment(date).add(1, view).toDate())}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <h2 className="text-sm font-medium text-gray-700">
              {moment(date).format("MMMM YYYY")}
            </h2>
          </div>

          {/* CALENDARIO */}
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              selectable
              resizable
              view={view}
              date={date}
              style={{ height: 600 }}
              onView={(v) => setView(v as ViewType)}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventMove}
              onEventResize={handleEventResize}
              draggableAccessor={(event: any) =>
                event?.estado !== "CANCELADO" && event?.estado !== "FINALIZADO"
              }
              resizableAccessor={(event: any) =>
                event?.estado !== "CANCELADO" && event?.estado !== "FINALIZADO"
              }
              toolbar={false}
              messages={{
                today: "Hoy",
                previous: "Anterior",
                next: "Siguiente",
                month: "Mes",
                week: "Semana",
                day: "Día",
              }}
              components={{
                event: ({ event }: any) => (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-pointer px-2 py-1 rounded-md text-sm font-medium truncate">
                          {event.title}
                        </div>
                      </TooltipTrigger>

                      <TooltipContent className="bg-white border text-gray-700 shadow-md text-xs p-2">
                        <p>
                          <strong>Paciente:</strong> {event.paciente}
                        </p>
                        <p>
                          <strong>Tipo:</strong> {event.tipo}
                        </p>
                        <p>
                          <strong>Hora:</strong>{" "}
                          {moment(event.start).format("HH:mm")} hs
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ),
              }}
              // SOMBREADO POR DÍA
              dayPropGetter={(d: Date) => {
                const day = d.getDay();
                const dateStr = d.toISOString().slice(0, 10);
                let style: React.CSSProperties = {};

                if (config.blockedDays.includes(dateStr)) {
                  style.backgroundColor = "#F3F4F6";
                  style.opacity = 0.6;
                  return { style };
                }

                if (config.surgeryDays.includes(dateStr)) {
                  style.backgroundColor = "#FEF9C3";
                  return { style };
                }

                if (
                  !config.workingDays.includes(day) &&
                  !config.extraAvailableDays.includes(dateStr)
                ) {
                  style.backgroundColor = "#E5E7EB";
                  style.opacity = 0.75;
                }

                return { style };
              }}
              // SOMBREADO POR HORAS
              slotPropGetter={(d: Date) => {
                const dateStr = d.toISOString().slice(0, 10);

                if (config.surgeryDays.includes(dateStr)) {
                  return { style: { backgroundColor: "#FEF9C3" } };
                }

                if (config.blockedDays.includes(dateStr)) {
                  return {
                    style: { backgroundColor: "#F3F4F6", opacity: 0.5 },
                  };
                }

                return {};
              }}
              // COLORES DE EVENTOS
              eventPropGetter={(event: any) => {
                const tipo = (event as CalendarEvent).tipo || "";
                const estado = (event as CalendarEvent).estado;

                let backgroundColor = tipo.toLowerCase().includes("consulta")
                  ? "#E0E7FF"
                  : tipo.toLowerCase().includes("cirug")
                  ? "#FEE2E2"
                  : "#DCFCE7";

                // estados del backend
                if (estado === "CONFIRMADO") backgroundColor = "#BBF7D0";
                if (estado === "CANCELADO") backgroundColor = "#E5E7EB";
                if (estado === "AUSENTE") backgroundColor = "#E5E7EB";
                if (estado === "FINALIZADO") backgroundColor = "#DBEAFE";

                return {
                  style: {
                    backgroundColor,
                    borderRadius: "6px",
                    color: "#1E1E1E",
                    border: "none",
                  },
                };
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
