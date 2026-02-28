"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  KanbanColumn as KanbanColumnType,
  KanbanPatient,
  EtapaCRM,
  ETAPA_ORDER,
} from "@/hooks/useCRMKanban";
import { KanbanColumn } from "./KanbanColumn";
import { PatientCard } from "./PatientCard";
import { LossReasonModal } from "./LossReasonModal";
import { useUpdateEtapaCRM } from "@/hooks/useUpdateEtapaCRM";
import { MotivoPerdidaCRM } from "@/hooks/useCRMKanban";
import { toast } from "sonner";

interface Props {
  columns: KanbanColumnType[];
  unreadMap?: Record<string, number>;
}

export function KanbanBoard({ columns, unreadMap }: Props) {
  const [activePatient, setActivePatient] = useState<KanbanPatient | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // Estado para modal de pérdida
  const [pendingDrop, setPendingDrop] = useState<{
    pacienteId: string;
    targetColumn: EtapaCRM;
  } | null>(null);

  const { mutate: updateEtapa, isPending } = useUpdateEtapaCRM();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Filter out columns not in ETAPA_ORDER (e.g., PROCEDIMIENTO_REALIZADO if backend sends it)
  // then sort according to canonical order
  const sortedColumns = [...columns]
    .filter((col) => ETAPA_ORDER.includes(col.etapa as EtapaCRM))
    .sort(
      (a, b) =>
        ETAPA_ORDER.indexOf(a.etapa as EtapaCRM) -
        ETAPA_ORDER.indexOf(b.etapa as EtapaCRM)
    );

  function handleDragStart(event: DragStartEvent) {
    const { patient, fromColumn } = event.active.data.current as {
      patient: KanbanPatient;
      fromColumn: string;
    };
    setActivePatient(patient);
    setActiveColumn(fromColumn);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePatient(null);
    setActiveColumn(null);

    const { over, active } = event;
    if (!over) return;

    const targetColumn = over.id as EtapaCRM;
    const { patient, fromColumn } = active.data.current as {
      patient: KanbanPatient;
      fromColumn: string;
    };

    if (targetColumn === fromColumn) return;

    if (targetColumn === "PERDIDO") {
      // Abrir modal para pedir motivo
      setPendingDrop({ pacienteId: patient.id, targetColumn });
      return;
    }

    updateEtapa(
      { pacienteId: patient.id, etapaCRM: targetColumn },
      {
        onError: () =>
          toast.error("No se pudo mover el paciente. Verificá los requisitos."),
      }
    );
  }

  function handleLossConfirm(motivo: MotivoPerdidaCRM) {
    if (!pendingDrop) return;
    updateEtapa(
      {
        pacienteId: pendingDrop.pacienteId,
        etapaCRM: "PERDIDO",
        motivoPerdida: motivo,
      },
      {
        onSuccess: () => toast.success("Paciente marcado como perdido"),
        onError: () => toast.error("No se pudo actualizar el estado"),
      }
    );
    setPendingDrop(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* El wrapper tiene overflow-x-auto para el scroll horizontal del kanban */}
        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
          <div className="flex gap-3 min-h-[500px] pb-2" style={{ width: "max-content" }}>
            {sortedColumns.map((col) => (
              <KanbanColumn key={col.etapa} column={col} unreadMap={unreadMap} />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activePatient && activeColumn ? (
            <div className="rotate-2 opacity-90 w-[220px]">
              <PatientCard patient={activePatient} columnId={activeColumn} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LossReasonModal
        open={!!pendingDrop}
        onConfirm={handleLossConfirm}
        onCancel={() => setPendingDrop(null)}
      />
    </>
  );
}
