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

moment.locale("es");
const localizer = momentLocalizer(moment);

export default function TurnosPage() {
  const [view, setView] = useState("week");
  const [date, setDate] = useState(new Date());
  const [openModal, setOpenModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const events = [
    {
      id: 1,
      title: "Consulta – Lautaro Caballero",
      paciente: "Lautaro Caballero",
      start: new Date(2025, 10, 11, 10, 0),
      end: new Date(2025, 10, 11, 10, 30),
      tipo: "Consulta",
      observaciones: "Primera vez",
    },
    {
      id: 2,
      title: "Intervención – Daniel",
      paciente: "Daniel Martínez",
      start: new Date(2025, 10, 12, 11, 0),
      end: new Date(2025, 10, 12, 13, 0),
      tipo: "Intervención",
      observaciones: "Blefaroplastia superior",
    },
  ];

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setOpenModal(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Primera fila con QuickAppointment y UpcomingAppointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickAppointment />
        <UpcomingAppointments />
      </div>

      {/* Segunda fila con calendario */}
      <Card className="p-4 shadow-sm">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-base font-medium text-gray-800">
            Agenda semanal
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Select onValueChange={(v) => setView(v)} defaultValue={view}>
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
          {/* Controles de navegación personalizados */}
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

          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              view={view}
              date={date}
              onNavigate={() => {}}
              onView={setView}
              onSelectEvent={handleSelectEvent}
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
                        <div
                          className="cursor-pointer px-2 py-1 rounded-md text-sm font-medium truncate"
                          onClick={() => handleSelectEvent(event)}
                        >
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
              eventPropGetter={(event) => {
                let backgroundColor =
                  event.tipo === "Consulta"
                    ? "#E0E7FF"
                    : event.tipo === "Intervención"
                    ? "#FEE2E2"
                    : "#DCFCE7";
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
