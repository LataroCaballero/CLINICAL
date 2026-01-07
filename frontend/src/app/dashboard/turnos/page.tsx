"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import QuickAppointment from "../components/QuickAppointment";
import UpcomingAppointments from "../components/UpcomingAppointments";

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
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
import AppointmentDetailModal from "./AppointmentDetailModal";
import SurgeryAppointmentModal from "./SurgeryAppointmentModal";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import { toast } from "sonner";
import { useTurnosRango } from "@/hooks/useTurnosRangos";
import { useReprogramarTurno } from "@/hooks/useReprogramarTurnos";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useAgenda } from "@/hooks/useAgenda";
import { AgendaConfig } from "@/hooks/useProfesionalMe";

moment.locale("es");
const localizer = momentLocalizer(moment);

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

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

// Helper para formatear fecha local (sin problemas de timezone)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper para verificar si un día está bloqueado según la agenda
function isDayBlocked(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda) return false;

  const dateStr = formatLocalDate(date);
  const dayOfWeek = date.getDay();

  // Si es día de cirugía, NO está bloqueado (se pueden agendar cirugías)
  if (isSurgeryDay(date, agenda)) return false;

  // Verificar días bloqueados extraordinarios
  const bloqueado = agenda.diasBloqueados?.some((d) => {
    if (d.fechaFin) {
      return dateStr >= d.fecha && dateStr <= d.fechaFin;
    }
    return d.fecha === dateStr;
  });

  if (bloqueado) return true;

  // Verificar si el día de la semana está activo en horarios de trabajo
  if (agenda.horariosTrabajo) {
    const diaConfig = agenda.horariosTrabajo[dayOfWeek];
    // Si no hay config para este día o no está activo, está bloqueado
    if (!diaConfig || !diaConfig.activo) return true;
  }

  return false;
}

// Helper para verificar si es día de cirugía
function isSurgeryDay(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda?.diasCirugia) return false;
  const dateStr = formatLocalDate(date);
  return agenda.diasCirugia.some((d) => d.fecha === dateStr);
}

// Calcular rango horario para un día específico
function getDayTimeRange(
  date: Date,
  agenda: AgendaConfig | null
): { min: Date; max: Date } | null {
  if (!agenda) return null;

  const dateStr = formatLocalDate(date);
  const dayOfWeek = date.getDay();

  // Si es día de cirugía, usar horario de cirugía
  const surgeryConfig = agenda.diasCirugia?.find((d) => d.fecha === dateStr);
  if (surgeryConfig) {
    const [startH, startM] = surgeryConfig.inicio.split(":").map(Number);
    const [endH, endM] = surgeryConfig.fin.split(":").map(Number);
    const min = new Date(date);
    min.setHours(startH, startM, 0, 0);
    const max = new Date(date);
    max.setHours(endH, endM, 0, 0);
    return { min, max };
  }

  // Usar horario de trabajo normal
  const dayConfig = agenda.horariosTrabajo?.[dayOfWeek];
  if (!dayConfig?.activo || !dayConfig.bloques?.length) return null;

  // Encontrar el inicio más temprano y fin más tardío
  let earliestStart = "23:59";
  let latestEnd = "00:00";

  for (const bloque of dayConfig.bloques) {
    if (bloque.inicio < earliestStart) earliestStart = bloque.inicio;
    if (bloque.fin > latestEnd) latestEnd = bloque.fin;
  }

  const [startH, startM] = earliestStart.split(":").map(Number);
  const [endH, endM] = latestEnd.split(":").map(Number);

  const min = new Date(date);
  min.setHours(startH, startM, 0, 0);
  const max = new Date(date);
  max.setHours(endH, endM, 0, 0);

  return { min, max };
}

// Calcular rango horario más extenso de la semana
function getWeekTimeRange(
  date: Date,
  agenda: AgendaConfig | null
): { min: Date; max: Date } {
  const defaultMin = new Date(date);
  defaultMin.setHours(8, 0, 0, 0);
  const defaultMax = new Date(date);
  defaultMax.setHours(20, 0, 0, 0);

  if (!agenda?.horariosTrabajo) return { min: defaultMin, max: defaultMax };

  let globalEarliestStart = "23:59";
  let globalLatestEnd = "00:00";

  // Revisar todos los días de la semana
  for (let i = 0; i < 7; i++) {
    const dayConfig = agenda.horariosTrabajo[i];
    if (!dayConfig?.activo || !dayConfig.bloques?.length) continue;

    for (const bloque of dayConfig.bloques) {
      if (bloque.inicio < globalEarliestStart) globalEarliestStart = bloque.inicio;
      if (bloque.fin > globalLatestEnd) globalLatestEnd = bloque.fin;
    }
  }

  // También considerar días de cirugía en la semana actual
  const weekStart = moment(date).startOf("week");
  const weekEnd = moment(date).endOf("week");

  agenda.diasCirugia?.forEach((d) => {
    const surgeryDate = moment(d.fecha);
    if (surgeryDate.isBetween(weekStart, weekEnd, "day", "[]")) {
      if (d.inicio < globalEarliestStart) globalEarliestStart = d.inicio;
      if (d.fin > globalLatestEnd) globalLatestEnd = d.fin;
    }
  });

  if (globalEarliestStart === "23:59" || globalLatestEnd === "00:00") {
    return { min: defaultMin, max: defaultMax };
  }

  const [startH, startM] = globalEarliestStart.split(":").map(Number);
  const [endH, endM] = globalLatestEnd.split(":").map(Number);

  const min = new Date(date);
  min.setHours(startH, startM, 0, 0);
  const max = new Date(date);
  max.setHours(endH, endM, 0, 0);

  return { min, max };
}

// Calcular slots disponibles para un día
function getAvailableSlotsCount(
  date: Date,
  agenda: AgendaConfig | null,
  existingEvents: CalendarEvent[],
  slotDuration: number = 30
): { total: number; reserved: number; available: number } {
  if (!agenda) return { total: 0, reserved: 0, available: 0 };

  const dateStr = formatLocalDate(date);
  const dayOfWeek = date.getDay();

  // Si está bloqueado, no hay slots
  if (isDayBlocked(date, agenda)) {
    return { total: 0, reserved: 0, available: 0 };
  }

  let totalMinutes = 0;

  // Si es día de cirugía
  const surgeryConfig = agenda.diasCirugia?.find((d) => d.fecha === dateStr);
  if (surgeryConfig) {
    const [startH, startM] = surgeryConfig.inicio.split(":").map(Number);
    const [endH, endM] = surgeryConfig.fin.split(":").map(Number);
    totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  } else {
    // Día normal de trabajo
    const dayConfig = agenda.horariosTrabajo?.[dayOfWeek];
    if (dayConfig?.activo && dayConfig.bloques?.length) {
      for (const bloque of dayConfig.bloques) {
        const [startH, startM] = bloque.inicio.split(":").map(Number);
        const [endH, endM] = bloque.fin.split(":").map(Number);
        totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
      }
    }
  }

  const total = Math.floor(totalMinutes / slotDuration);

  // Contar turnos reservados (no cancelados ni ausentes)
  const reserved = existingEvents.filter((e) => {
    const eventDateStr = formatLocalDate(e.start);
    return (
      eventDateStr === dateStr &&
      e.estado !== "CANCELADO" &&
      e.estado !== "AUSENTE"
    );
  }).length;

  return { total, reserved, available: Math.max(0, total - reserved) };
}

export default function TurnosPage() {
  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(() => {
    // Inicializar con la fecha a mediodía para evitar problemas de timezone
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });

  const [openNewModal, setOpenNewModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openSurgeryModal, setOpenSurgeryModal] = useState(false);
  const [surgeryDate, setSurgeryDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { data: agenda } = useAgenda(effectiveProfessionalId);

  // Normalizar la fecha para evitar problemas
  const normalizedDate = useMemo(() => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [date]);

  const reprogramar = useReprogramarTurno();

  // Rango visible según view y date
  // Para la vista mensual, incluir semanas completas al inicio y fin
  const desde = useMemo(() => {
    if (view === "month") {
      return moment(normalizedDate).startOf("month").startOf("week").format("YYYY-MM-DD");
    }
    return moment(normalizedDate).startOf(view).format("YYYY-MM-DD");
  }, [normalizedDate, view]);

  const hasta = useMemo(() => {
    if (view === "month") {
      return moment(normalizedDate).endOf("month").endOf("week").format("YYYY-MM-DD");
    }
    return moment(normalizedDate).endOf(view).format("YYYY-MM-DD");
  }, [normalizedDate, view]);

  const { data: turnosRango = [] } = useTurnosRango(
    effectiveProfessionalId ?? undefined,
    desde,
    hasta
  );

  // Map turnos -> eventos
  useEffect(() => {
    const mapped: CalendarEvent[] = (turnosRango as any[]).map((t) => ({
      id: t.id,
      title: `${t.tipoTurno?.nombre ?? "Turno"} – ${t.paciente?.nombreCompleto ?? ""
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

  // Calcular rango horario según la vista
  // Para día y semana, usar el rango más extenso de la semana para no cortar eventos
  const timeRange = useMemo(() => {
    const weekRange = getWeekTimeRange(normalizedDate, agenda ?? null);

    // Si es vista diaria, podemos mostrar el rango específico del día
    // pero con margen para no cortar eventos
    if (view === "day") {
      const dayRange = getDayTimeRange(normalizedDate, agenda ?? null);
      if (dayRange) {
        // Agregar 1 hora de margen antes y después
        const min = new Date(dayRange.min);
        min.setHours(min.getHours() - 1);
        const max = new Date(dayRange.max);
        max.setHours(max.getHours() + 1);
        return { min, max };
      }
    }

    return weekRange;
  }, [view, normalizedDate, agenda]);

  // Formato de fecha/rango para mostrar en header
  const dateRangeLabel = useMemo(() => {
    if (view === "day") {
      return moment(normalizedDate).format("D [de] MMMM [de] YYYY");
    }
    if (view === "week") {
      const start = moment(normalizedDate).startOf("week");
      const end = moment(normalizedDate).endOf("week");
      if (start.month() === end.month()) {
        return `${start.format("D")} - ${end.format("D [de] MMMM [de] YYYY")}`;
      }
      return `${start.format("D [de] MMMM")} - ${end.format("D [de] MMMM [de] YYYY")}`;
    }
    return moment(normalizedDate).format("MMMM [de] YYYY");
  }, [view, normalizedDate]);

  // Optimistic update helper
  function updateEventTime(eventId: string, start: Date, end: Date) {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, start, end } : e))
    );
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setOpenDetailModal(true);
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
    if (isDayBlocked(start, agenda ?? null)) {
      toast.error("Ese día no está disponible");
      return;
    }
    if (isSurgeryDay(start, agenda ?? null)) {
      // En día de cirugía, abrir modal de cirugía
      setSurgeryDate(start);
      setOpenSurgeryModal(true);
      return;
    }
    setOpenNewModal(true);
  };

  if (!effectiveProfessionalId) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-[100vw]">
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            Seleccioná un profesional desde el selector global para ver la agenda.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[100vw]">
      {/* PRIMERA FILA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickAppointment profesionalId={effectiveProfessionalId} />
        <UpcomingAppointments profesionalId={effectiveProfessionalId} />
      </div>

      {/* SEGUNDA FILA: CALENDARIO */}
      <Card className="p-4 shadow-sm">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-base font-medium text-gray-800">
            Agenda
          </CardTitle>

          <div className="flex gap-2 items-center">
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

            <Button variant="default" onClick={() => setOpenNewModal(true)}>
              Nuevo turno
            </Button>
          </div>
        </CardHeader>

        <NewAppointmentModal
          open={openNewModal}
          onOpenChange={setOpenNewModal}
          onSwitchToSurgery={() => {
            setOpenSurgeryModal(true);
          }}
        />

        <AppointmentDetailModal
          open={openDetailModal}
          onOpenChange={setOpenDetailModal}
          event={selectedEvent}
        />

        <SurgeryAppointmentModal
          open={openSurgeryModal}
          onOpenChange={setOpenSurgeryModal}
          defaultDate={surgeryDate}
        />

        <CardContent>
          {/* Navegación */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = moment(normalizedDate).subtract(1, view).toDate();
                  d.setHours(12, 0, 0, 0);
                  setDate(d);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button variant="outline" onClick={() => {
                const d = new Date();
                d.setHours(12, 0, 0, 0);
                setDate(d);
              }}>
                Hoy
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = moment(normalizedDate).add(1, view).toDate();
                  d.setHours(12, 0, 0, 0);
                  setDate(d);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <h2 className="text-base font-semibold text-gray-800 capitalize">
              {dateRangeLabel}
            </h2>
          </div>

          {/* CALENDARIO */}
          {view === "month" ? (
            // Vista mensual personalizada con conteo de slots
            // En español, la semana empieza en Lunes
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div
                    key={d}
                    className="p-2 text-center text-sm font-medium text-gray-600"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {(() => {
                  const startOfMonth = moment(normalizedDate).startOf("month");
                  const endOfMonth = moment(normalizedDate).endOf("month");
                  const startDate = startOfMonth.clone().startOf("week");
                  const endDate = endOfMonth.clone().endOf("week");
                  const days: JSX.Element[] = [];

                  let currentDay = startDate.clone();
                  while (currentDay.isSameOrBefore(endDate, "day")) {
                    // Crear fecha normalizada a mediodía para evitar problemas de timezone
                    const dayDate = currentDay.clone().hour(12).minute(0).second(0).toDate();
                    const isCurrentMonth = currentDay.month() === moment(normalizedDate).month();
                    const isToday = currentDay.isSame(moment(), "day");
                    const blocked = isDayBlocked(dayDate, agenda ?? null);
                    const surgery = isSurgeryDay(dayDate, agenda ?? null);
                    const slots = getAvailableSlotsCount(dayDate, agenda ?? null, events);

                    let bgColor = "bg-white";
                    if (!isCurrentMonth) bgColor = "bg-gray-50";
                    else if (blocked) bgColor = "bg-gray-100";
                    else if (surgery) bgColor = "bg-yellow-50";

                    days.push(
                      <div
                        key={currentDay.format("YYYY-MM-DD")}
                        className={`min-h-[80px] p-2 border-b border-r ${bgColor} ${isToday ? "ring-2 ring-inset ring-indigo-500" : ""
                          } cursor-pointer hover:bg-gray-50 transition-colors`}
                        onClick={() => {
                          setDate(dayDate);
                          setView("day");
                        }}
                      >
                        <div
                          className={`text-sm font-medium ${!isCurrentMonth
                            ? "text-gray-400"
                            : isToday
                              ? "text-indigo-600"
                              : "text-gray-700"
                            }`}
                        >
                          {currentDay.format("D")}
                        </div>

                        {isCurrentMonth && !blocked && slots.total > 0 && (
                          <div className="mt-1 space-y-0.5">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium text-green-600">
                                {slots.available}
                              </span>{" "}
                              disponibles
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">{slots.reserved}</span>{" "}
                              reservados
                            </div>
                          </div>
                        )}

                        {isCurrentMonth && blocked && (
                          <div className="mt-1 text-xs text-gray-400">
                            No disponible
                          </div>
                        )}

                        {isCurrentMonth && surgery && (
                          <div className="mt-1 text-xs text-yellow-700 font-medium">
                            Cirugía
                          </div>
                        )}
                      </div>
                    );

                    currentDay.add(1, "day");
                  }

                  return days;
                })()}
              </div>
            </div>
          ) : (
            // Vista diaria y semanal con react-big-calendar
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                selectable
                resizable
                view={view}
                date={normalizedDate}
                min={timeRange.min}
                max={timeRange.max}
                style={{ height: 600 }}
                onView={(v) => setView(v as ViewType)}
                onNavigate={(newDate) => {
                  const d = new Date(newDate);
                  d.setHours(12, 0, 0, 0);
                  setDate(d);
                }}
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
                formats={{
                  // Ocultar la hora en los eventos
                  eventTimeRangeFormat: () => "",
                  eventTimeRangeStartFormat: () => "",
                  eventTimeRangeEndFormat: () => "",
                }}
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
                          <div className="cursor-pointer px-1 py-0.5 text-xs font-medium truncate leading-tight">
                            <div className="font-semibold truncate">{event.tipo}</div>
                            <div className="truncate text-gray-600">{event.paciente}</div>
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
                            {moment(event.start).format("HH:mm")} -{" "}
                            {moment(event.end).format("HH:mm")} hs
                          </p>
                          <p>
                            <strong>Estado:</strong> {event.estado}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ),
                }}
                // SOMBREADO POR DÍA (usando agenda real con fecha local)
                dayPropGetter={(d: Date) => {
                  const style: React.CSSProperties = {};

                  // Día de cirugía (amarillo)
                  if (isSurgeryDay(d, agenda ?? null)) {
                    style.backgroundColor = "#FEF9C3";
                    return { style };
                  }

                  // Día bloqueado o no laboral (gris)
                  if (isDayBlocked(d, agenda ?? null)) {
                    style.backgroundColor = "#E5E7EB";
                    style.opacity = 0.6;
                    return { style };
                  }

                  return { style };
                }}
                // SOMBREADO POR HORAS (usando fecha local)
                slotPropGetter={(d: Date) => {
                  // Día de cirugía
                  if (isSurgeryDay(d, agenda ?? null)) {
                    return { style: { backgroundColor: "#FEF9C3" } };
                  }

                  // Día bloqueado
                  if (isDayBlocked(d, agenda ?? null)) {
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
                      borderRadius: "4px",
                      color: "#1E1E1E",
                      border: "none",
                      padding: "2px 4px",
                      fontSize: "11px",
                    },
                  };
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
