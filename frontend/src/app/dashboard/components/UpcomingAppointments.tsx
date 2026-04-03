"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Play,
  Loader2,
  MessageSquareText,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  X,
  FileText,
} from "lucide-react";
import { useLiveTurnoActions } from "@/hooks/useLiveTurnoActions";
import { useLiveTurnoStore } from "@/store/live-turno.store";
import TurnoHCModal from "./TurnoHCModal";

type Props = {
  profesionalId?: string;
  focusMode?: boolean;
};

type TurnoAgenda = {
  id: string;
  inicio: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  observaciones?: string | null;
  entradaHCId?: string | null;
  esCirugia?: boolean;
  paciente: { id: string; nombreCompleto: string; diagnostico?: string | null; tratamiento?: string | null };
  tipoTurno: { id: string; nombre: string; esCirugia?: boolean };
};

function yyyyMmDd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hhmm(iso: string) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function tipoTurnoClass(nombre: string, focusMode: boolean) {
  const n = (nombre || "").toLowerCase();
  if (focusMode) {
    if (n.includes("cirug")) return "bg-red-900/40 text-red-300";
    if (n.includes("preop") || n.includes("pre-") || n.includes("pre operator"))
      return "bg-orange-900/40 text-orange-300";
    if (n.includes("primera")) return "bg-indigo-900/40 text-indigo-300";
    if (n.includes("trat")) return "bg-green-900/40 text-green-300";
    return "bg-slate-700 text-slate-300";
  }
  if (n.includes("cirug")) return "bg-red-100 text-red-600";
  if (n.includes("preop") || n.includes("pre-") || n.includes("pre operator"))
    return "bg-orange-100 text-orange-600";
  if (n.includes("primera")) return "bg-indigo-100 text-indigo-600";
  if (n.includes("trat")) return "bg-green-100 text-green-600";
  return "bg-gray-100 text-gray-600";
}

function estadoUi(estado: TurnoAgenda["estado"], focusMode: boolean) {
  switch (estado) {
    case "CONFIRMADO":
      return {
        dot: "bg-green-500",
        text: focusMode ? "text-green-400" : "text-green-600",
        label: "Confirmado",
      };
    case "PENDIENTE":
      return {
        dot: "bg-yellow-500",
        text: focusMode ? "text-yellow-400" : "text-yellow-600",
        label: "Pendiente",
      };
    case "FINALIZADO":
      return {
        dot: "bg-blue-500",
        text: focusMode ? "text-blue-400" : "text-blue-600",
        label: "Finalizado",
      };
    case "AUSENTE":
      return {
        dot: "bg-gray-400",
        text: focusMode ? "text-slate-400" : "text-gray-600",
        label: "Ausente",
      };
    case "CANCELADO":
    default:
      return {
        dot: "bg-gray-400",
        text: focusMode ? "text-slate-400" : "text-gray-600",
        label: "Cancelado",
      };
  }
}

function isCirugia(t: TurnoAgenda) {
  return (
    t.esCirugia ||
    t.tipoTurno?.esCirugia ||
    (t.tipoTurno?.nombre ?? "").toLowerCase().includes("cirug")
  );
}

export default function UpcomingAppointments({ profesionalId, focusMode = false }: Props) {
  const { iniciarSesion } = useLiveTurnoActions();
  const session = useLiveTurnoStore((state) => state.session);

  // Unified date state — always a concrete date, defaults to today
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // HC modal state
  const [hcTurno, setHcTurno] = useState<TurnoAgenda | null>(null);

  // Query: agenda for the selected date — always enabled when profesionalId is available
  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ["turnos", "agenda", profesionalId, yyyyMmDd(selectedDate)],
    queryFn: async () => {
      const res = await api.get<TurnoAgenda[]>("/turnos/agenda", {
        params: { profesionalId, fecha: yyyyMmDd(selectedDate) },
      });
      return res.data ?? [];
    },
    enabled: !!profesionalId,
  });

  if (!profesionalId) {
    return (
      <Card
        className={
          focusMode
            ? "bg-slate-800/60 border border-slate-700 shadow-sm rounded-xl overflow-hidden"
            : "bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden"
        }
      >
        <CardHeader className="pb-3">
          <CardTitle
            className={`text-base font-semibold ${focusMode ? "text-slate-200" : "text-gray-800"}`}
          >
            Próximos turnos del día
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className={`text-sm ${focusMode ? "text-slate-400" : "text-gray-600"}`}>
            Seleccioná un profesional para ver los próximos turnos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- Derive display state from selectedDate ---
  const hoyStr = yyyyMmDd(new Date());
  const isToday = yyyyMmDd(selectedDate) === hoyStr;
  const isPast = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));
  const isHoyOPasado = isToday || isPast;

  const dayLabel = capitalize(format(selectedDate, "EEEE d 'de' MMMM", { locale: es }));
  const header = isToday
    ? "Turnos del día"
    : isPast
    ? `Historial — ${dayLabel}`
    : `Turnos — ${dayLabel}`;

  // Metrics (shown for today and past days)
  const metrics = isHoyOPasado
    ? {
        total: turnos.length,
        finalizados: turnos.filter((t) => t.estado === "FINALIZADO").length,
        cirugias: turnos.filter(isCirugia).length,
        ausentes: turnos.filter((t) => t.estado === "AUSENTE").length,
        cancelados: turnos.filter((t) => t.estado === "CANCELADO").length,
      }
    : null;

  // Theme tokens
  const cardCls = focusMode
    ? "bg-slate-800/60 border border-slate-700 shadow-sm rounded-xl overflow-hidden"
    : "bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden";
  const titleCls = focusMode ? "text-slate-200" : "text-gray-800";
  const thCls = focusMode
    ? "bg-slate-900/60 text-slate-400"
    : "bg-gray-50 text-gray-600";
  const rowCls = focusMode
    ? "border-b border-slate-700 hover:bg-slate-700/40 transition group"
    : "border-b border-gray-100 hover:bg-gray-50 transition group";
  const tdPrimCls = focusMode ? "text-slate-200" : "text-gray-800";
  const tdSecCls = focusMode ? "text-slate-300" : "text-gray-700";
  const tdMutedCls = focusMode ? "text-slate-500" : "text-gray-500";
  const tableBorderCls = focusMode ? "border-t border-slate-700" : "border-t border-gray-100";
  const emptyTextCls = focusMode ? "text-slate-400" : "text-gray-600";
  const navBtnCls = focusMode
    ? "h-7 w-7 p-0 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center"
    : "h-7 w-7 p-0 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center";
  const metricChipCls = focusMode
    ? "text-xs px-2 py-1 rounded-md bg-slate-700 text-slate-300"
    : "text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600";

  return (
    <>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className={`text-base font-semibold ${titleCls}`}>
              {isLoading ? "Cargando..." : header}
            </CardTitle>

            <div className="flex items-center gap-1.5">
              {/* Day navigation — previous */}
              <button
                className={navBtnCls}
                onClick={() =>
                  setSelectedDate((d) => {
                    const n = new Date(d);
                    n.setDate(n.getDate() - 1);
                    return n;
                  })
                }
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Day navigation — next */}
              <button
                className={navBtnCls}
                onClick={() =>
                  setSelectedDate((d) => {
                    const n = new Date(d);
                    n.setDate(n.getDate() + 1);
                    return n;
                  })
                }
                aria-label="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Reset to today — only shown when not on today */}
              {!isToday && (
                <button
                  className={navBtnCls}
                  onClick={() => setSelectedDate(new Date())}
                  aria-label="Volver a hoy"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Calendar picker */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`${navBtnCls}${!isToday ? (focusMode ? " border-indigo-500 text-indigo-400" : " border-indigo-400 text-indigo-500") : ""}`}
                    aria-label="Seleccionar fecha"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) setSelectedDate(d);
                      setCalendarOpen(false);
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-hidden p-0">
          {/* Metrics strip — shown for today and past days */}
          {metrics && (
            <div className={`flex flex-wrap gap-2 px-4 py-2 border-b ${focusMode ? "border-slate-700" : "border-gray-100"}`}>
              <span className={metricChipCls}>
                <span className="font-medium">{metrics.total}</span> turnos
              </span>
              <span className={`${metricChipCls} ${focusMode ? "!bg-blue-900/40 !text-blue-300" : "!bg-blue-50 !text-blue-600"}`}>
                <span className="font-medium">{metrics.finalizados}</span> finalizados
              </span>
              {metrics.cirugias > 0 && (
                <span className={`${metricChipCls} ${focusMode ? "!bg-red-900/40 !text-red-300" : "!bg-red-50 !text-red-600"}`}>
                  <span className="font-medium">{metrics.cirugias}</span> {metrics.cirugias === 1 ? "cirugía" : "cirugías"}
                </span>
              )}
              {metrics.ausentes > 0 && (
                <span className={`${metricChipCls} ${focusMode ? "!bg-slate-600 !text-slate-300" : "!bg-gray-100 !text-gray-500"}`}>
                  <span className="font-medium">{metrics.ausentes}</span> ausentes
                </span>
              )}
              {metrics.cancelados > 0 && (
                <span className={`${metricChipCls} ${focusMode ? "!bg-slate-600 !text-slate-300" : "!bg-gray-100 !text-gray-500"}`}>
                  <span className="font-medium">{metrics.cancelados}</span> cancelados
                </span>
              )}
            </div>
          )}

          <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
            {isLoading ? (
              <div className="p-4">
                <p className={`text-sm ${emptyTextCls}`}>Cargando turnos...</p>
              </div>
            ) : turnos.length === 0 ? (
              <div className="p-4">
                <p className={`text-sm ${emptyTextCls}`}>
                  No hay turnos para este día.
                </p>
              </div>
            ) : (
              <TooltipProvider delayDuration={300}>
                <table className={`w-full text-sm text-left ${tableBorderCls}`}>
                  <thead className={thCls}>
                    <tr>
                      <th className="px-4 py-2 font-medium">Horario</th>
                      <th className="px-4 py-2 font-medium">Paciente</th>
                      <th className="px-4 py-2 font-medium">Tratamiento</th>
                      <th className="px-4 py-2 font-medium">Tipo de Turno</th>
                      <th className="px-4 py-2 font-medium">Estado</th>
                      <th className="px-4 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnos.map((t) => {
                      const e = estadoUi(t.estado, focusMode);
                      const tipo = t.tipoTurno?.nombre ?? "Turno";
                      const hasObs = !!t.observaciones;

                      const row = (
                        <tr key={t.id} className={rowCls}>
                          <td className={`px-4 py-2 font-medium ${tdPrimCls}`}>
                            {hhmm(t.inicio)}
                          </td>
                          <td className={`px-4 py-2 ${tdSecCls}`}>
                            <div className="flex items-center gap-1.5">
                              {t.paciente?.nombreCompleto ?? "-"}
                              {hasObs && (
                                <MessageSquareText
                                  className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                                    focusMode ? "text-slate-500" : "text-gray-400"
                                  }`}
                                />
                              )}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-2 text-xs max-w-[160px] truncate ${tdMutedCls}`}
                          >
                            {t.paciente?.tratamiento || "-"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${tipoTurnoClass(
                                tipo,
                                focusMode
                              )}`}
                            >
                              {tipo}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${e.dot}`} />
                              <span className={`text-xs font-medium ${e.text}`}>
                                {e.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              {/* Ver HC — turnos FINALIZADOS en hoy o días pasados */}
                              {isHoyOPasado && t.estado === "FINALIZADO" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setHcTurno(t)}
                                  className={`h-7 px-2 text-xs ${
                                    focusMode
                                      ? "text-indigo-400 hover:bg-slate-700 hover:text-indigo-300"
                                      : "text-indigo-600 hover:bg-indigo-50"
                                  }`}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Ver HC
                                </Button>
                              )}

                              {/* Iniciar sesión — turnos no cancelados/finalizados */}
                              {t.estado !== "CANCELADO" && t.estado !== "FINALIZADO" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => iniciarSesion.mutate(t.id)}
                                  disabled={iniciarSesion.isPending || !!session}
                                  className={`h-7 px-2 text-xs ${
                                    focusMode
                                      ? "bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                                      : ""
                                  }`}
                                >
                                  {iniciarSesion.isPending &&
                                  iniciarSesion.variables === t.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3 mr-1" />
                                      Iniciar
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );

                      if (!hasObs) return row;

                      return (
                        <Tooltip key={t.id}>
                          <TooltipTrigger asChild>{row}</TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-xs">
                            <p className="font-medium mb-1">Observaciones</p>
                            <p>{t.observaciones}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </tbody>
                </table>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HC Modal */}
      <TurnoHCModal
        turno={hcTurno}
        open={!!hcTurno}
        onClose={() => setHcTurno(null)}
        selectedDate={selectedDate}
      />
    </>
  );
}
