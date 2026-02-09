"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Timer } from "lucide-react";
import { useLiveTurnoStore } from "@/store/live-turno.store";
import { useLiveTurnoTimer, formatTimer } from "@/hooks/useLiveTurnoTimer";

export default function ActiveSessionBanner() {
  const session = useLiveTurnoStore((state) => state.session);
  const restore = useLiveTurnoStore((state) => state.restore);
  const elapsed = useLiveTurnoTimer();

  if (!session) return null;

  return (
    <Card className="bg-violet-950/80 border-violet-500/40 shadow-lg shadow-violet-500/10">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative flex h-3 w-3 rounded-full bg-green-500" />
          </div>
          <div>
            <p className="text-xs text-violet-300 font-medium">
              Sesion en curso
            </p>
            <p className="text-base font-semibold text-slate-100">
              {session.pacienteNombre}
            </p>
            <span className="text-xs text-slate-400">
              {session.tipoTurno}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-violet-300">
            <Timer className="w-4 h-4" />
            <span className="text-sm font-mono font-medium">
              {formatTimer(elapsed)}
            </span>
          </div>
          <Button
            onClick={restore}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Volver a consulta
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
