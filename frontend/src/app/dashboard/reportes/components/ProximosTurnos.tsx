"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Clock, User, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { TurnoResumen } from "@/types/reportes";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

interface ProximosTurnosProps {
  turnos: TurnoResumen[];
  loading?: boolean;
}

export function ProximosTurnos({ turnos, loading = false }: ProximosTurnosProps) {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "CONFIRMADO":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Confirmado
          </Badge>
        );
      case "PENDIENTE":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pendiente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {estado}
          </Badge>
        );
    }
  };

  const getFechaLabel = (fecha: string) => {
    const fechaObj = parseISO(fecha);
    if (isToday(fechaObj)) return "Hoy";
    if (isTomorrow(fechaObj)) return "Mañana";
    return format(fechaObj, "EEEE d", { locale: es });
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Próximos Turnos
        </CardTitle>
        <Link href="/dashboard/turnos">
          <Button variant="ghost" size="sm" className="text-xs">
            Ver todos
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay turnos próximos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {turnos.map((turno) => (
              <Link
                key={turno.id}
                href={`/dashboard/turnos?turnoId=${turno.id}`}
                className="block"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: turno.tipoTurno.color }}
                  >
                    {turno.paciente.nombreCompleto.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {turno.paciente.nombreCompleto}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{turno.hora}</span>
                      <span className="text-gray-300">|</span>
                      <span className="capitalize">{getFechaLabel(turno.fecha)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getEstadoBadge(turno.estado)}
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${turno.tipoTurno.color}20`,
                        color: turno.tipoTurno.color,
                      }}
                    >
                      {turno.tipoTurno.nombre}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
