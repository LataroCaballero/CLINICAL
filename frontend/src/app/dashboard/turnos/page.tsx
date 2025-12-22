"use client";
import QuickAppointment from "../components/QuickAppointment";
import UpcomingAppointments from "../components/UpcomingAppointments";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
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
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { toast } from "sonner";
import { useEffect } from "react";
import { useTurnosRango } from "@/hooks/useTurnosRangos";
import { useProfesionales } from "@/hooks/useProfesionales";

moment.locale("es");
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarEvent {
  id: string;
  title: string;
  paciente: string;
  start: Date;
  end: Date;
  tipo: string;
  estado: string;
  observaciones?: string;
}

// ---------------------------
// CONFIGURACIÓN DEL PROFESIONAL
// ---------------------------
const config = {
  workingDays: [1, 2, 3, 4, 5], // lun - vie
  surgeryDays: ["2025-11-15", "2025-11-20"],
  blockedDays: ["2025-11-18", "2025-11-25"],
  extraAvailableDays: ["2025-11-17"],
};

// ---------------------------
// FUNCIÓN PARA VERIFICAR SI UN DÍA ESTÁ BLOQUEADO
// ---------------------------
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
  type ViewType = "day" | "week" | "month";

  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(new Date());
  const [openModal, setOpenModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  const { data: profesionales = [] } = useProfesionales();
  const [profesionalId, setProfesionalId] = useState<string>("");

  useEffect(() => {
    if (!profesionalId && profesionales.length > 0) {
      setProfesionalId(profesionales[0].id);
    }
  }, [profesionales, profesionalId]);

  const desde = moment(date).startOf(view).format("YYYY-MM-DD");
  const hasta = moment(date).endOf(view).format("YYYY-MM-DD");

  const { data: turnosRango = [], isLoading } = useTurnosRango(
    profesionalId || undefined,
    desde,
    hasta
  );

  useEffect(() => {
    const mapped = turnosRango.map((t) => ({
      id: t.id, // OJO: ahora es string (no number)
      title: `${t.tipoTurno?.nombre ?? "Turno"} – ${t.paciente?.nombreCompleto ?? ""}`,
      paciente: t.paciente?.nombreCompleto ?? "",
      start: new Date(t.inicio),
      end: new Date(t.fin),
      tipo: t.tipoTurno?.nombre ?? "Turno",
      estado: t.estado, // viene del enum
      observaciones: t.observaciones ?? "",
    }));

    setEvents(mapped);
  }, [turnosRango]);

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setOpenModal(true);
  };

  // ---------------------------
  // DRAG & DROP: MOVER EVENTO
  // ---------------------------
  const handleEventMove = ({ event, start, end }: any) => {
    if (isBlockedDay(start)) {
      toast.error("Ese día no está disponible");
      return;
    }

    const updated = events.map((ev) =>
      ev.id === event.id ? { ...ev, start, end } : ev
    );

    setEvents(updated);
    // TODO: llamar al backend para guardar
  };

  // ---------------------------
  // REDIMENSIONAR EVENTO (RESIZE)
  // ---------------------------
  const handleEventResize = ({ event, start, end }: any) => {
    if (isBlockedDay(start)) {
      toast.error("No se puede cambiar la duración en un día bloqueado");
      return;
    }

    const updated = events.map((ev) =>
      ev.id === event.id ? { ...ev, start, end } : ev
    );

    setEvents(updated);
    // TODO: llamar backend
  };

  // ---------------------------
  // NUEVO TURNO AL CLICKEAR SLOT
  // ---------------------------
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
        <QuickAppointment />
        <UpcomingAppointments profesionalId={profesionalId} />
      </div>

      {/* SEGUNDA FILA: CALENDARIO */}
      <Card className="p-4 shadow-sm">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-base font-medium text-gray-800">
            Agenda semanal
          </CardTitle>



          <div className="flex gap-2 items-center">
            <Select
              value={profesionalId}
              onValueChange={(v) => setProfesionalId(v)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Profesional" />
              </SelectTrigger>
              <SelectContent>
                {profesionales.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.usuario?.nombre} {p.usuario?.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => setView(v as ViewType)} defaultValue={view}>
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

          {/* CALENDARIO COMPLETO */}
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor={(event) => (event as CalendarEvent).start}
              endAccessor={(event) => (event as CalendarEvent).end}
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
              draggableAccessor={() => true}
              resizableAccessor={() => true}
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
                        <p><strong>Paciente:</strong> {event.paciente}</p>
                        <p><strong>Tipo:</strong> {event.tipo}</p>
                        <p><strong>Hora:</strong> {moment(event.start).format("HH:mm")} hs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ),
              }}

              // SOMBREADO POR DÍA
              dayPropGetter={(date) => {
                const day = date.getDay();
                const dateStr = date.toISOString().slice(0, 10);

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

                if (!config.workingDays.includes(day) &&
                  !config.extraAvailableDays.includes(dateStr)) {
                  style.backgroundColor = "#E5E7EB";
                  style.opacity = 0.75;
                }

                return { style };
              }}

              // SOMBREADO POR HORAS
              slotPropGetter={(date) => {
                const dateStr = date.toISOString().slice(0, 10);

                if (config.surgeryDays.includes(dateStr)) {
                  return { style: { backgroundColor: "#FEF9C3" } };
                }

                if (config.blockedDays.includes(dateStr)) {
                  return { style: { backgroundColor: "#F3F4F6", opacity: 0.5 } };
                }

                return {};
              }}

              // COLORES DE EVENTOS
              eventPropGetter={(event) => {
                let backgroundColor =
                  (event as CalendarEvent).tipo === "Consulta"
                    ? "#E0E7FF"
                    : (event as CalendarEvent).tipo === "Intervención"
                      ? "#FEE2E2"
                      : "#DCFCE7";

                if ((event as CalendarEvent).estado === "Confirmado") {
                  backgroundColor = "#4ADE80";
                }

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
