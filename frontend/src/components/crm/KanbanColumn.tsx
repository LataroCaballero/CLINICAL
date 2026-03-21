"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanColumn as KanbanColumnType, ETAPA_LABELS, EtapaCRM } from "@/hooks/useCRMKanban";
import { PatientCard } from "./PatientCard";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/useUIStore";

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
  unreadMap?: Record<string, number>;
  pendingPatientIds?: Set<string>;
  onOpenDrawer?: (pacienteId: string) => void;
  onOpenActions?: (patient: import("@/hooks/useCRMKanban").KanbanPatient) => void;
}

export function KanbanColumn({ column, unreadMap, pendingPatientIds, onOpenDrawer, onOpenActions }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.etapa });
  const { focusModeEnabled: fm } = useUIStore();

  const borderColor = ETAPA_COLORS[column.etapa as EtapaCRM] ?? "border-t-gray-300";

  return (
    <div
      className={cn(
        "flex flex-col min-w-[220px] max-w-[240px] rounded-xl border border-t-4",
        fm
          ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)]"
          : "bg-gray-50 border-gray-200",
        borderColor,
        isOver && (fm ? "bg-slate-700/50" : "bg-blue-50 border-blue-200")
      )}
    >
      {/* Header */}
      <div className={cn("px-3 py-2 border-b", fm ? "border-[var(--fc-border)]" : "border-gray-200")}>
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold uppercase tracking-wide truncate", fm ? "text-[var(--fc-text-primary)]" : "text-gray-700")}>
            {ETAPA_LABELS[column.etapa as EtapaCRM] ?? column.etapa}
          </span>
          <span className={cn("ml-2 text-xs font-bold rounded-full px-2 py-0.5 shrink-0", fm ? "bg-[var(--fc-bg-hover)] text-[var(--fc-text-secondary)]" : "bg-gray-200 text-gray-500")}>
            {column.total}
          </span>
        </div>
      </div>

      {/* Drop zone + cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 p-2 min-h-[120px] flex-1",
          isOver && (fm ? "bg-slate-700/50" : "bg-blue-50")
        )}
      >
        {column.pacientes.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            columnId={column.etapa}
            unreadWA={unreadMap?.[patient.id] ?? 0}
            isPending={pendingPatientIds?.has(patient.id)}
            onOpenDrawer={onOpenDrawer}
            onOpenActions={onOpenActions}
          />
        ))}
        {column.pacientes.length === 0 && (
          <div className={cn("flex-1 flex items-center justify-center text-xs py-4", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-400")}>
            Arrastrá pacientes aquí
          </div>
        )}
      </div>
    </div>
  );
}
