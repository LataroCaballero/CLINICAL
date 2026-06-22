"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/useUIStore";
import { TurnoRango, useTurnosRango } from "@/hooks/useTurnosRangos";
import { getEstadoTurnoChip } from "@/lib/estadoTurno";
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


export function TratamientosTab({ profesionalId }: { profesionalId: string | null }) {
  const { focusModeEnabled: fm } = useUIStore();

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filterTipoId, setFilterTipoId] = useState<string | null>(null);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [drawerInitialView, setDrawerInitialView] = useState<"default" | "historia">("default");

  const { desde, hasta } = getMonthRange(selectedMonth);
  const monthLabel = `${MESES[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;

  const { data: turnosData, isLoading } = useTurnosRango(
    profesionalId ?? undefined,
    desde,
    hasta
  );

  // Fuente A: tipoTurno de flujo TRATAMIENTO (comportamiento actual)
  // Fuente B: turno tipo "Consulta" con entrada HC tipoEntrada=TRATAMIENTO (Phase 42 dual)
  const isFuenteB = (t: TurnoRango) =>
    t.tipoTurno.nombre === "Consulta" && t.tipoEntradaHC === "TRATAMIENTO";

  // TRAT-04/05: source B requires ultimoTratamiento != null (oculta CIRUGIA espurios sin tratamiento real)
  // Source A (flujoPaciente=TRATAMIENTO) queda siempre visible (turnos agendados, con o sin HC)
  const tratamientoTurnos = (turnosData ?? []).filter(
    (t) =>
      t.tipoTurno.flujoPaciente === "TRATAMIENTO" ||
      (isFuenteB(t) && t.ultimoTratamiento != null)
  );

  // Derive unique tipos present in tratamientoTurnos for the dropdown (source A only)
  const tiposEnMes = Array.from(
    new Map(
      tratamientoTurnos
        .filter((t) => !isFuenteB(t))
        .map((t) => [t.tipoTurno.id, t.tipoTurno])
    ).values()
  );

  // Whether there are any fuente-B rows to show in the dropdown
  const hasFuenteB = tratamientoTurnos.some(isFuenteB);

  // Apply tipo filter client-side
  const visibleTurnos = (() => {
    if (!filterTipoId) return tratamientoTurnos;
    if (filterTipoId === "CONSULTA_TRATAMIENTO") return tratamientoTurnos.filter(isFuenteB);
    return tratamientoTurnos.filter((t) => t.tipoTurno.id === filterTipoId && !isFuenteB(t));
  })();

  // Count by estado for header — sobre filas visibles post-filtro (TRAT-06)
  const countByEstado = tratamientoTurnos.reduce<Record<string, number>>(
    (acc, t) => {
      acc[t.estado] = (acc[t.estado] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const totalCount = tratamientoTurnos.length;

  // Agrupación por estados reales del enum
  const realizados = countByEstado["FINALIZADO"] ?? 0;
  const programados =
    (countByEstado["PENDIENTE"] ?? 0) +
    (countByEstado["CONFIRMADO"] ?? 0) +
    (countByEstado["EN_ESPERA"] ?? 0) +
    (countByEstado["SIENDO_ATENDIDO"] ?? 0);
  const cancelados =
    (countByEstado["CANCELADO"] ?? 0) + (countByEstado["AUSENTE"] ?? 0);

  const breakdownParts = [
    realizados > 0 ? `${realizados} realizados` : null,
    programados > 0 ? `${programados} programados` : null,
    cancelados > 0 ? `${cancelados} cancelados` : null,
  ].filter(Boolean);

  const breakdown = breakdownParts.join(", ");

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
        {!isLoading && (tiposEnMes.length > 0 || hasFuenteB) && (
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
            {hasFuenteB && (
              <option value="CONSULTA_TRATAMIENTO">Consulta → Tratamiento</option>
            )}
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
                <th className={cn("py-2 px-3 text-left font-medium text-sm", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-500")}>
                  Último tratamiento
                </th>
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
                      onClick={() => {
                        setDrawerInitialView("default");
                        setSelectedPacienteId(turno.paciente.id);
                      }}
                      className={cn(
                        "text-left hover:underline font-medium",
                        fm ? "text-[var(--fc-text-primary)]" : "text-gray-800"
                      )}
                    >
                      {turno.paciente.nombreCompleto}
                    </button>
                  </td>
                  <td className={cn("py-2 px-3", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-600")}>
                    {isFuenteB(turno) ? "Consulta → Tratamiento" : turno.tipoTurno.nombre}
                  </td>
                  <td className="py-2 px-3">
                    {(() => {
                      const chip = getEstadoTurnoChip(turno.estado);
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            chip.className
                          )}
                        >
                          {chip.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2 px-3">
                    {turno.ultimoTratamiento ? (
                      <button
                        onClick={() => {
                          setDrawerInitialView("historia");
                          setSelectedPacienteId(turno.paciente.id);
                        }}
                        className={cn(
                          "text-left hover:underline font-medium truncate max-w-[200px] block",
                          fm ? "text-[var(--fc-text-primary)]" : "text-gray-800"
                        )}
                        title={turno.ultimoTratamiento}
                      >
                        {turno.ultimoTratamiento}
                      </button>
                    ) : (
                      <span className={cn(fm ? "text-[var(--fc-text-secondary)]" : "text-gray-400")}>
                        —
                      </span>
                    )}
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
        initialView={drawerInitialView}
      />
    </div>
  );
}
