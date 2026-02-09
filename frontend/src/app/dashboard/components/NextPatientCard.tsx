"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Clock, CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLiveTurnoActions } from "@/hooks/useLiveTurnoActions";
import { useLiveTurnoStore } from "@/store/live-turno.store";

type Props = {
  profesionalId: string;
};

type TurnoAgenda = {
  id: string;
  inicio: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  observaciones?: string | null;
  paciente: { id: string; nombreCompleto: string; diagnostico?: string | null };
  tipoTurno: { id: string; nombre: string };
};

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function NextPatientCard({ profesionalId }: Props) {
  const { iniciarSesion } = useLiveTurnoActions();
  const session = useLiveTurnoStore((state) => state.session);

  // Same query key + shape as UpcomingAppointments so they share cache
  const { data } = useQuery({
    queryKey: ["turnos", "upcoming", profesionalId],
    queryFn: async () => {
      const res = await api.get<TurnoAgenda[]>("/turnos/proximos", {
        params: { profesionalId, dias: 30 },
      });
      const turnos = res.data ?? [];
      if (turnos.length > 0) {
        const firstDate = turnos[0].inicio.slice(0, 10);
        return {
          fecha: firstDate,
          turnos: turnos.filter((t) => t.inicio.slice(0, 10) === firstDate),
        };
      }
      return { fecha: new Date().toISOString().slice(0, 10), turnos: [] as TurnoAgenda[] };
    },
    enabled: !!profesionalId,
  });

  const nextTurno = (data?.turnos ?? []).find(
    (t) => t.estado === "PENDIENTE" || t.estado === "CONFIRMADO"
  );

  if (!nextTurno) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 shadow-lg">
        <CardContent className="flex items-center gap-4 py-6">
          <CalendarCheck className="w-8 h-8 text-violet-400" />
          <div>
            <p className="text-sm font-medium text-slate-200">
              No hay mas turnos para hoy
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Tu agenda esta libre
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-violet-500/30 shadow-lg shadow-violet-500/10">
      <CardContent className="flex items-center justify-between py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Proximo paciente</p>
            <p className="text-lg font-semibold text-slate-100">
              {nextTurno.paciente.nombreCompleto}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-violet-400 font-medium">
                {hhmm(nextTurno.inicio)}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400">
                {nextTurno.tipoTurno.nombre}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="lg"
          onClick={() => iniciarSesion.mutate(nextTurno.id)}
          disabled={iniciarSesion.isPending || !!session}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6"
        >
          {iniciarSesion.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Iniciar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
