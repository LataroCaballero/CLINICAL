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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Play, Loader2, MessageSquareText, ChevronLeft, ChevronRight } from "lucide-react";
import { useLiveTurnoActions } from "@/hooks/useLiveTurnoActions";
import { useLiveTurnoStore } from "@/store/live-turno.store";

type Props = {
  profesionalId?: string;
  focusMode?: boolean;
};

type TurnoAgenda = {
  id: string;
  inicio: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  observaciones?: string | null;
  paciente: { id: string; nombreCompleto: string; diagnostico?: string | null; tratamiento?: string | null };
  tipoTurno: { id: string; nombre: string };
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

export default function UpcomingAppointments({ profesionalId, focusMode = false }: Props) {
  const { iniciarSesion } = useLiveTurnoActions();
  const session = useLiveTurnoStore((state) => state.session);
  const [dateIndex, setDateIndex] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["turnos", "upcoming", profesionalId],
    queryFn: async () => {
      if (!profesionalId) return { dates: [] as string[], grouped: {} as Record<string, TurnoAgenda[]> };

      const res = await api.get<TurnoAgenda[]>("/turnos/proximos", {
        params: { profesionalId, dias: 30 },
      });

      const turnos = res.data ?? [];

      // Group by date
      const grouped: Record<string, TurnoAgenda[]> = {};
      for (const t of turnos) {
        const key = yyyyMmDd(new Date(t.inicio));
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      }

      const dates = Object.keys(grouped).sort();
      return { dates, grouped };
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

  const dates = data?.dates ?? [];
  const grouped = data?.grouped ?? {};

  // Clamp index in case data reloads
  const safeIndex = Math.min(dateIndex, Math.max(0, dates.length - 1));
  const currentDateStr = dates[safeIndex] ?? yyyyMmDd(new Date());
  const turnos: TurnoAgenda[] = grouped[currentDateStr] ?? [];

  const hoyStr = yyyyMmDd(new Date());
  const esHoy = currentDateStr === hoyStr;

  const fechaDate = (() => {
    const [year, month, day] = currentDateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  })();

  const header =
    esHoy && turnos.length > 0
      ? "Turnos del día"
      : turnos.length > 0
      ? `Turnos — ${capitalize(format(fechaDate, "EEEE d 'de' MMMM", { locale: es }))}`
      : "Próximos turnos";

  const canPrev = safeIndex > 0;
  const canNext = safeIndex < dates.length - 1;

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
    ? "h-7 w-7 p-0 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
    : "h-7 w-7 p-0 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30";
  const dateLabelCls = focusMode ? "text-xs text-slate-400" : "text-xs text-gray-400";

  return (
    <Card className={cardCls}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-base font-semibold ${titleCls}`}>
            {isLoading ? "Cargando..." : header}
          </CardTitle>

          {/* Day navigation */}
          {!isLoading && dates.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className={dateLabelCls}>
                {safeIndex + 1} / {dates.length}
              </span>
              <button
                className={navBtnCls}
                onClick={() => setDateIndex((i) => Math.max(0, i - 1))}
                disabled={!canPrev}
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className={navBtnCls}
                onClick={() => setDateIndex((i) => Math.min(dates.length - 1, i + 1))}
                disabled={!canNext}
                aria-label="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
          {isLoading ? (
            <div className="p-4">
              <p className={`text-sm ${emptyTextCls}`}>Cargando turnos...</p>
            </div>
          ) : turnos.length === 0 ? (
            <div className="p-4">
              <p className={`text-sm ${emptyTextCls}`}>No hay turnos próximos.</p>
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
  );
}
