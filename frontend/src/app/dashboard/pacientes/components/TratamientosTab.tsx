"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useTurnosRango } from "@/hooks/useTurnosRangos";
import PatientDrawer from "./PatientDrawer";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getMonthRange(month: Date): { desde: string; hasta: string } {
  const y = month.getFullYear();
  const m = month.getMonth();
  const lastDay = new Date(y, m + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { desde: fmt(new Date(y, m, 1)), hasta: fmt(lastDay) };
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ESTADO_LABEL: Record<string, string> = {
  REALIZADO: "realizados",
  PROGRAMADO: "programados",
  CANCELADO: "cancelado",
};

const ESTADO_BADGE_CLASS: Record<string, string> = {
  PROGRAMADO: "bg-indigo-100 text-indigo-700",
  REALIZADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export function TratamientosTab({ profesionalId }: { profesionalId: string | null }) {
  const { focusModeEnabled: fm } = useUIStore();

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filterTipoId, setFilterTipoId] = useState<string | null>(null);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);

  const { desde, hasta } = getMonthRange(selectedMonth);
  const monthLabel = `${MESES[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;

  const { data: turnosData, isLoading } = useTurnosRango(
    profesionalId ?? undefined,
    desde,
    hasta
  );

  // Filter to TRATAMIENTO-type turnos only
  const tratamientoTurnos = (turnosData ?? []).filter(
    (t) => t.tipoTurno.flujoPaciente === "TRATAMIENTO"
  );

  // Derive unique tipos present in tratamientoTurnos for the dropdown
  const tiposEnMes = Array.from(
    new Map(
      tratamientoTurnos.map((t) => [t.tipoTurno.id, t.tipoTurno])
    ).values()
  );

  // Apply tipo filter client-side
  const visibleTurnos = filterTipoId
    ? tratamientoTurnos.filter((t) => t.tipoTurno.id === filterTipoId)
    : tratamientoTurnos;

  // Count by estado for header
  const countByEstado = tratamientoTurnos.reduce<Record<string, number>>(
    (acc, t) => {
      acc[t.estado] = (acc[t.estado] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const totalCount = tratamientoTurnos.length;

  const breakdown = Object.entries(ESTADO_LABEL)
    .filter(([estado]) => (countByEstado[estado] ?? 0) > 0)
    .map(([estado, label]) => `${countByEstado[estado]} ${label}`)
    .join(", ");

  const headerSummary =
    totalCount > 0
      ? `${totalCount} tratamiento${totalCount !== 1 ? "s" : ""}${breakdown ? ` (${breakdown})` : ""}`
      : null;

  function prevMonth() {
    setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setFilterTipoId(null);
  }

  function nextMonth() {
    setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setFilterTipoId(null);
  }

  const containerClass = cn(
    "rounded-xl border flex flex-col gap-4 p-4",
    fm ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)]" : "bg-white border-gray-200"
  );

  // No professional selected
  if (!profesionalId) {
    return (
      <div className={cn(containerClass, "p-8 text-center text-muted-foreground")}>
        Seleccioná un profesional para ver los tratamientos.
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </Button>
        <span className={cn("text-sm font-medium min-w-[120px] text-center", fm ? "text-[var(--fc-text-primary)]" : "text-gray-800")}>
          {monthLabel}
        </span>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
          <ChevronRight size={16} />
        </Button>

        {/* Tipo filter dropdown */}
        {!isLoading && tiposEnMes.length > 0 && (
          <select
            value={filterTipoId ?? ""}
            onChange={(e) => setFilterTipoId(e.target.value || null)}
            className={cn(
              "ml-auto h-8 rounded-md border px-2 text-sm",
              fm
                ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)]"
                : "bg-white border-gray-200 text-gray-800"
            )}
          >
            <option value="">Todos los tipos</option>
            {tiposEnMes.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Header summary */}
      {!isLoading && headerSummary && (
        <p className={cn("text-sm", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-600")}>
          {headerSummary}
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {/* Empty state — no tratamientos */}
      {!isLoading && tratamientoTurnos.length === 0 && (
        <div className={cn("rounded-lg border p-8 text-center", fm ? "border-[var(--fc-border)]" : "border-gray-100")}>
          <p className={cn("font-medium", fm ? "text-[var(--fc-text-primary)]" : "text-gray-800")}>
            Sin tratamientos en {monthLabel}
          </p>
          <p className={cn("text-sm mt-1", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-500")}>
            Los turnos con tipo de tratamiento aparecerán aquí
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && visibleTurnos.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn("text-xs uppercase tracking-wide border-b", fm ? "text-[var(--fc-text-secondary)] border-[var(--fc-border)]" : "text-gray-500 border-gray-200")}>
                <th className="py-2 px-3 text-left font-medium">Fecha y hora</th>
                <th className="py-2 px-3 text-left font-medium">Paciente</th>
                <th className="py-2 px-3 text-left font-medium">Tipo de turno</th>
                <th className="py-2 px-3 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibleTurnos.map((turno) => (
                <tr
                  key={turno.id}
                  className={cn(
                    "border-b transition-colors hover:bg-gray-50",
                    turno.estado === "CANCELADO" && "opacity-40",
                    fm && "hover:bg-[var(--fc-bg-hover)]"
                  )}
                >
                  <td className={cn("py-2 px-3 whitespace-nowrap", fm ? "text-[var(--fc-text-primary)]" : "text-gray-700")}>
                    {formatDateTime(turno.inicio)}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelectedPacienteId(turno.paciente.id)}
                      className={cn(
                        "text-left hover:underline font-medium",
                        fm ? "text-[var(--fc-text-primary)]" : "text-gray-800"
                      )}
                    >
                      {turno.paciente.nombreCompleto}
                    </button>
                  </td>
                  <td className={cn("py-2 px-3", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-600")}>
                    {turno.tipoTurno.nombre}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        ESTADO_BADGE_CLASS[turno.estado] ?? "bg-gray-100 text-gray-500"
                      )}
                    >
                      {turno.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Patient drawer */}
      <PatientDrawer
        open={!!selectedPacienteId}
        onOpenChange={(open) => {
          if (!open) setSelectedPacienteId(null);
        }}
        pacienteId={selectedPacienteId}
      />
    </div>
  );
}
