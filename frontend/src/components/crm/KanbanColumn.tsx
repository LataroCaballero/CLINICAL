"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanColumn as KanbanColumnType, ETAPA_LABELS, EtapaCRM } from "@/hooks/useCRMKanban";
import { PatientCard } from "./PatientCard";
import { cn } from "@/lib/utils";

const ETAPA_COLORS: Partial<Record<EtapaCRM, string>> = {
  NUEVO_LEAD: "border-t-slate-400",
  TURNO_AGENDADO: "border-t-blue-400",
  CONSULTADO: "border-t-indigo-400",
  PRESUPUESTO_ENVIADO: "border-t-amber-400",
  PROCEDIMIENTO_REALIZADO: "border-t-orange-400",
  CONFIRMADO: "border-t-green-500",
  PERDIDO: "border-t-gray-400",
  SIN_CLASIFICAR: "border-t-gray-300",
};

interface Props {
  column: KanbanColumnType;
}

export function KanbanColumn({ column }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.etapa });

  const borderColor = ETAPA_COLORS[column.etapa as EtapaCRM] ?? "border-t-gray-300";

  return (
    <div
      className={cn(
        "flex flex-col min-w-[220px] max-w-[240px] bg-gray-50 rounded-xl border border-gray-200 border-t-4",
        borderColor,
        isOver && "bg-blue-50 border-blue-200"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide truncate">
            {ETAPA_LABELS[column.etapa as EtapaCRM] ?? column.etapa}
          </span>
          <span className="ml-2 text-xs font-bold text-gray-500 bg-gray-200 rounded-full px-2 py-0.5 shrink-0">
            {column.total}
          </span>
        </div>
      </div>

      {/* Drop zone + cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 p-2 min-h-[120px] flex-1",
          isOver && "bg-blue-50"
        )}
      >
        {column.pacientes.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            columnId={column.etapa}
          />
        ))}
        {column.pacientes.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 py-4">
            Arrastrá pacientes aquí
          </div>
        )}
      </div>
    </div>
  );
}
