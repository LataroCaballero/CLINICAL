"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Play, Loader2 } from "lucide-react";
import { useLiveTurnoActions } from "@/hooks/useLiveTurnoActions";
import { useLiveTurnoStore } from "@/store/live-turno.store";

type Props = {
  profesionalId?: string;
};

type TurnoAgenda = {
  id: string;
  inicio: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  paciente: { id: string; nombreCompleto: string };
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

function tipoTurnoClass(nombre: string) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("cirug")) return "bg-red-100 text-red-600";
  if (n.includes("preop") || n.includes("pre-") || n.includes("pre operator"))
    return "bg-orange-100 text-orange-600";
  if (n.includes("primera")) return "bg-indigo-100 text-indigo-600";
  if (n.includes("trat")) return "bg-green-100 text-green-600";
  return "bg-gray-100 text-gray-600";
}

function estadoUi(estado: TurnoAgenda["estado"]) {
  switch (estado) {
    case "CONFIRMADO":
      return { dot: "bg-green-500", text: "text-green-600", label: "Confirmado" };
    case "PENDIENTE":
      return { dot: "bg-yellow-500", text: "text-yellow-600", label: "Pendiente" };
    case "FINALIZADO":
      return { dot: "bg-blue-500", text: "text-blue-600", label: "Finalizado" };
    case "AUSENTE":
      return { dot: "bg-gray-400", text: "text-gray-600", label: "Ausente" };
    case "CANCELADO":
    default:
      return { dot: "bg-gray-400", text: "text-gray-600", label: "Cancelado" };
  }
}

export default function UpcomingAppointments({ profesionalId }: Props) {
  const { iniciarSesion } = useLiveTurnoActions();
  const session = useLiveTurnoStore((state) => state.session);

  const { data, isLoading } = useQuery({
    queryKey: ["turnos", "upcoming", profesionalId],
    queryFn: async () => {
      if (!profesionalId) return { fecha: yyyyMmDd(new Date()), turnos: [] as TurnoAgenda[] };

      const hoy = new Date();
      for (let i = 0; i <= 30; i++) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() + i);
        const fecha = yyyyMmDd(d);

        const res = await api.get<TurnoAgenda[]>("/turnos/agenda", {
          params: { profesionalId, fecha },
        });

        const turnos = res.data ?? [];
        if (turnos.length > 0) {
          return { fecha, turnos };
        }
      }

      // No se encontraron turnos en el rango
      return { fecha: yyyyMmDd(new Date()), turnos: [] as TurnoAgenda[] };
    },
    enabled: !!profesionalId,
    staleTime: 10_000,
  });

  if (!profesionalId) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden max-h-[492px] mt-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            Próximos turnos del día
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            Seleccioná un profesional para ver los próximos turnos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const turnos: TurnoAgenda[] = data?.turnos ?? [];
  const fechaStr = data?.fecha; // Date string from query (yyyy-MM-dd format)

  const hoyStr = yyyyMmDd(new Date());
  const esHoy = fechaStr === hoyStr;

  // Parse date manually to avoid timezone issues
  // Using explicit year, month, day avoids UTC interpretation
  const fechaDate = fechaStr
    ? (() => {
        const [year, month, day] = fechaStr.split("-").map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
      })()
    : new Date();

  // Only show "del día" when it's today and we have turnos
  // Otherwise show the specific date
  const header = esHoy && turnos.length > 0
    ? "Próximos turnos del día"
    : turnos.length > 0
      ? `Turnos para el próximo ${capitalize(
          format(fechaDate, "EEEE d 'de' MMMM", { locale: es })
        )}`
      : "Próximos turnos";

  return (
    <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden max-h-[492px] mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-800">
          {header}
        </CardTitle>
      </CardHeader>

      <CardContent className="overflow-scroll p-0">
        <div className="overflow-y-auto max-h-[492px]">
          {isLoading ? (
            <div className="p-4">
              <p className="text-sm text-gray-600">Cargando turnos...</p>
            </div>
          ) : turnos.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-gray-600">No hay turnos próximos.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-t border-gray-100">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Horario</th>
                  <th className="px-4 py-2 font-medium">Paciente</th>
                  <th className="px-4 py-2 font-medium">Tipo de Turno</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t) => {
                  const e = estadoUi(t.estado);
                  const tipo = t.tipoTurno?.nombre ?? "Turno";

                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {hhmm(t.inicio)}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {t.paciente?.nombreCompleto ?? "-"}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${tipoTurnoClass(
                            tipo
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
                            className="h-7 px-2 text-xs"
                          >
                            {iniciarSesion.isPending && iniciarSesion.variables === t.id ? (
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
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
