"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import QuickAppointment from "../components/QuickAppointment";

import moment from "moment";
import "moment/locale/es";

import CalendarGrid from "./CalendarGrid";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarPlus, X } from "lucide-react";

import NewAppointmentModal from "./NewAppointmentModal";
import AppointmentDetailModal from "./AppointmentDetailModal";
import SurgeryAppointmentModal from "./SurgeryAppointmentModal";
import { toast } from "sonner";
import { useTurnosRango } from "@/hooks/useTurnosRangos";
import { useReprogramarTurno } from "@/hooks/useReprogramarTurnos";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useAgenda } from "@/hooks/useAgenda";
import { AgendaConfig } from "@/hooks/useProfesionalMe";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfigTiposTurno } from "@/hooks/useConfigTiposTurno";
import { motion, AnimatePresence } from "framer-motion";

moment.locale("es");

type ViewType = "day" | "week" | "month";

interface CalendarEvent {
  id: string;
  title: string;
  paciente: string;
  start: Date;
  end: Date;
  tipo: string;
  tipoTurnoId: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  observaciones?: string;
}

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

// Calcular slots disponibles para un día
function getDaySlotStats(
  date: Date,
  agenda: AgendaConfig | null,
  existingEvents: CalendarEvent[],
  slotDuration: number = 30
): { total: number; confirmed: number; pending: number; available: number; occupancy: number } {
  const empty = { total: 0, confirmed: 0, pending: 0, available: 0, occupancy: 0 };
  if (!agenda) return empty;

  const dateStr = formatLocalDate(date);
  const dayOfWeek = date.getDay();

  if (isDayBlocked(date, agenda)) return empty;

  let totalMinutes = 0;

  const surgeryConfig = agenda.diasCirugia?.find((d) => d.fecha === dateStr);
  if (surgeryConfig) {
    const [startH, startM] = surgeryConfig.inicio.split(":").map(Number);
    const [endH, endM] = surgeryConfig.fin.split(":").map(Number);
    totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  } else {
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
  if (total === 0) return empty;

  const dayEvents = existingEvents.filter((e) => {
    const eventDateStr = formatLocalDate(e.start);
    return eventDateStr === dateStr && e.estado !== "CANCELADO" && e.estado !== "AUSENTE";
  });

  const confirmed = dayEvents.filter((e) => e.estado === "CONFIRMADO" || e.estado === "FINALIZADO").length;
  const pending = dayEvents.filter((e) => e.estado === "PENDIENTE").length;
  const reserved = confirmed + pending;
  const available = Math.max(0, total - reserved);
  const occupancy = Math.min(1, reserved / total);

  return { total, confirmed, pending, available, occupancy };
}

/** Interpolate red(0%) → yellow(50%) → green(100%) as HSLA */
function occupancyColor(occupancy: number, alpha: number = 1): string {
  // 0 → hue 0 (red), 0.5 → hue 45 (amber/yellow), 1.0 → hue 130 (green)
  const hue = occupancy <= 0.5
    ? occupancy * 2 * 45          // 0..45
    : 45 + (occupancy - 0.5) * 2 * 85; // 45..130
  return `hsla(${hue}, 75%, 50%, ${alpha})`;
}

export default function TurnosPage() {
  const { data: user } = useCurrentUser();

  // Vista derivada: el usuario puede cambiar manualmente, sino se usa la default por rol
  const [viewOverride, setViewOverride] = useState<ViewType | null>(null);
  const view: ViewType = viewOverride ?? (user?.rol === "PROFESIONAL" ? "month" : "week");
  const setView = (v: ViewType) => setViewOverride(v);

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });

  const [quickAppointmentOpen, setQuickAppointmentOpen] = useState(false);

  const [openNewModal, setOpenNewModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openSurgeryModal, setOpenSurgeryModal] = useState(false);
  const [surgeryDate, setSurgeryDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newSlotDate, setNewSlotDate] = useState<Date | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { data: agenda } = useAgenda(effectiveProfessionalId);
  const { data: configTiposTurno } = useConfigTiposTurno(effectiveProfessionalId);

  // Build color map: tipoTurnoId -> colorHex
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (configTiposTurno) {
      for (const c of configTiposTurno) {
        if (c.colorHex) map[c.tipoTurnoId] = c.colorHex;
      }
    }
    return map;
  }, [configTiposTurno]);

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
      tipoTurnoId: t.tipoTurnoId ?? "",
      estado: t.estado,
      observaciones: t.observaciones ?? "",
    }));

    setEvents(mapped);
  }, [turnosRango]);

  // Calcular rango horario según los días visibles
  // Se toma el inicio más temprano y fin más tardío de los días activos mostrados
  const timeRange = useMemo(() => {
    const defaultMin = new Date(normalizedDate);
    defaultMin.setHours(8, 0, 0, 0);
    const defaultMax = new Date(normalizedDate);
    defaultMax.setHours(20, 0, 0, 0);

    if (!agenda) return { min: defaultMin, max: defaultMax };

    // Obtener los días realmente visibles
    const visibleDays: Date[] = [];
    if (view === "day" || view === "month") {
      visibleDays.push(new Date(normalizedDate));
    } else {
      const start = moment(normalizedDate).startOf("week");
      for (let i = 0; i < 7; i++) {
        visibleDays.push(start.clone().add(i, "day").hour(12).toDate());
      }
    }

    let earliestStart = "23:59";
    let latestEnd = "00:00";

    for (const day of visibleDays) {
      // Saltear días bloqueados
      if (isDayBlocked(day, agenda)) continue;

      const range = getDayTimeRange(day, agenda);
      if (!range) continue;

      const startStr = `${String(range.min.getHours()).padStart(2, "0")}:${String(range.min.getMinutes()).padStart(2, "0")}`;
      const endStr = `${String(range.max.getHours()).padStart(2, "0")}:${String(range.max.getMinutes()).padStart(2, "0")}`;

      if (startStr < earliestStart) earliestStart = startStr;
      if (endStr > latestEnd) latestEnd = endStr;
    }

    if (earliestStart === "23:59" || latestEnd === "00:00") {
      return { min: defaultMin, max: defaultMax };
    }

    const [startH, startM] = earliestStart.split(":").map(Number);
    const [endH, endM] = latestEnd.split(":").map(Number);

    const min = new Date(normalizedDate);
    min.setHours(startH, startM, 0, 0);
    const max = new Date(normalizedDate);
    max.setHours(endH, endM, 0, 0);

    return { min, max };
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
      setSurgeryDate(start);
      setOpenSurgeryModal(true);
      return;
    }
    setNewSlotDate(start);
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
    <div className="flex flex-col gap-4 p-6 max-w-[100vw] h-[calc(100dvh-3.5rem)]">
      {/* CALENDARIO - Contenido principal */}
      <Card className="p-4 shadow-sm flex-1 flex flex-col min-h-0">
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
          onOpenChange={(v) => {
            setOpenNewModal(v);
            if (!v) setNewSlotDate(null);
          }}
          onSwitchToSurgery={() => {
            setOpenSurgeryModal(true);
          }}
          selectedEvent={newSlotDate ? {
            fecha: newSlotDate.toISOString(),
            hora: `${String(newSlotDate.getHours()).padStart(2, "0")}:${String(newSlotDate.getMinutes()).padStart(2, "0")}`,
          } : null}
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

        <CardContent className="flex-1 flex flex-col min-h-0">
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
            // Vista mensual personalizada
            <div className="flex-1 min-h-0 flex flex-col rounded-md border border-gray-200 overflow-hidden">
              {/* Header días de la semana */}
              <div className="grid grid-cols-7 bg-gray-50 border-b shrink-0">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div
                    key={d}
                    className="p-2 text-center text-sm font-medium text-gray-600"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Grid de días - ocupa todo el alto restante */}
              <div className="flex-1 min-h-0 grid grid-cols-7 overflow-y-auto auto-rows-fr">
                {(() => {
                  const startOfMonth = moment(normalizedDate).startOf("month");
                  const endOfMonth = moment(normalizedDate).endOf("month");
                  const startDate = startOfMonth.clone().startOf("week");
                  const endDate = endOfMonth.clone().endOf("week");
                  const days: JSX.Element[] = [];

                  let currentDay = startDate.clone();
                  while (currentDay.isSameOrBefore(endDate, "day")) {
                    const dayDate = currentDay.clone().hour(12).minute(0).second(0).toDate();
                    const isCurrentMonth = currentDay.month() === moment(normalizedDate).month();
                    const isToday = currentDay.isSame(moment(), "day");
                    const blocked = isDayBlocked(dayDate, agenda ?? null);
                    const surgery = isSurgeryDay(dayDate, agenda ?? null);
                    const stats = getDaySlotStats(dayDate, agenda ?? null, events);
                    const isWorkDay = isCurrentMonth && !blocked && stats.total > 0;

                    let bgColor = "bg-white";
                    if (!isCurrentMonth) bgColor = "bg-gray-50/80";
                    else if (blocked) bgColor = "bg-gray-100";
                    else if (surgery) bgColor = "bg-yellow-50";

                    days.push(
                      <div
                        key={currentDay.format("YYYY-MM-DD")}
                        className={`relative p-2 border-b border-r ${bgColor} ${
                          isToday ? "ring-2 ring-inset ring-indigo-500" : ""
                        } cursor-pointer hover:brightness-[0.97] transition-all flex flex-col`}
                        style={isWorkDay ? {
                          boxShadow: `inset 0 -6px 12px -2px ${occupancyColor(stats.occupancy, 0.25)}`,
                          borderBottom: `2px solid ${occupancyColor(stats.occupancy, 0.4)}`,
                        } : undefined}
                        onClick={() => {
                          setDate(dayDate);
                          setView("day");
                        }}
                      >
                        {/* Número del día */}
                        <div
                          className={`text-sm font-medium ${
                            !isCurrentMonth
                              ? "text-gray-300"
                              : isToday
                                ? "text-indigo-600 font-bold"
                                : "text-gray-700"
                          }`}
                        >
                          {currentDay.format("D")}
                        </div>

                        {/* Stats del día laboral */}
                        {isWorkDay && (
                          <div className="mt-auto space-y-0.5">
                            {stats.available > 0 && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                <span className="text-red-500 font-medium">{stats.available}</span>
                                <span className="text-red-400">libres</span>
                              </div>
                            )}
                            {stats.pending > 0 && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-amber-500 font-medium">{stats.pending}</span>
                                <span className="text-amber-400">sin confirmar</span>
                              </div>
                            )}
                            {stats.confirmed > 0 && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span className="text-emerald-500 font-medium">{stats.confirmed}</span>
                                <span className="text-emerald-400">confirmados</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bloqueado */}
                        {isCurrentMonth && blocked && (
                          <div className="mt-auto text-[11px] text-gray-400">
                            No disponible
                          </div>
                        )}

                        {/* Cirugía */}
                        {isCurrentMonth && surgery && (
                          <div className="mt-1 text-[11px] text-yellow-700 font-medium">
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
            // Vista diaria y semanal con grid custom
            <CalendarGrid
              className="flex-1 min-h-0"
              view={view as "day" | "week"}
              date={normalizedDate}
              events={events}
              agenda={agenda ?? null}
              timeRange={timeRange}
              colorMap={colorMap}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventMove={handleEventMove}
              onEventResize={handleEventResize}
            />
          )}
        </CardContent>
      </Card>

      {/* Pestaña flotante + Panel deslizable de QuickAppointment */}
      <AnimatePresence>
        {!quickAppointmentOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setQuickAppointmentOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg rounded-l-lg px-2 py-4 flex flex-col items-center gap-1 transition-colors"
            title="Turno rápido"
          >
            <CalendarPlus className="w-5 h-5" />
            <span className="text-xs font-medium [writing-mode:vertical-lr] rotate-180">
              Turno rápido
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {quickAppointmentOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickAppointmentOpen(false)}
            className="fixed inset-0 bg-black/20 z-40"
          />
        )}
      </AnimatePresence>

      {/* Panel deslizable */}
      <AnimatePresence>
        {quickAppointmentOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-base font-semibold text-gray-800">
                Turno rápido
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuickAppointmentOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuickAppointment profesionalId={effectiveProfessionalId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
