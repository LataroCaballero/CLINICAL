"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { CardActionsSheet } from "./CardActionsSheet";
import { useUpdateEtapaCRM } from "@/hooks/useUpdateEtapaCRM";
import { MotivoPerdidaCRM } from "@/hooks/useCRMKanban";
import { toast } from "sonner";
import PatientDrawer from "@/app/dashboard/pacientes/components/PatientDrawer";
import { NuevoTurnoModal } from "@/components/patient/PatientDrawer/views/NuevoTurnoModal";

interface Props {
  columns: KanbanColumnType[];
  unreadMap?: Record<string, number>;
}

// Aplica movimientos optimistas al array de columnas
function applyPendingMoves(
  cols: KanbanColumnType[],
  pending: Record<string, EtapaCRM>
): KanbanColumnType[] {
  if (Object.keys(pending).length === 0) return cols;

  const lookup: Record<string, KanbanPatient> = {};
  for (const col of cols) {
    for (const p of col.pacientes) lookup[p.id] = p;
  }

  return cols.map((col) => {
    const remaining = col.pacientes.filter(
      (p) => !(p.id in pending) || pending[p.id] === col.etapa
    );
    const incoming = Object.entries(pending)
      .filter(([, target]) => target === col.etapa)
      .map(([id]) => lookup[id])
      .filter((p): p is KanbanPatient => !!p && !remaining.find((r) => r.id === p.id));

    const pacientes = [...incoming, ...remaining];
    return { ...col, pacientes, total: pacientes.length };
  });
}

export function KanbanBoard({ columns, unreadMap }: Props) {
  const [activePatient, setActivePatient] = useState<KanbanPatient | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  // pacienteId -> etapa destino (movimiento en vuelo)
  const [pendingMoves, setPendingMoves] = useState<Record<string, EtapaCRM>>({});

  // Modals / drawers
  const [drawerPatientId, setDrawerPatientId] = useState<string | null>(null);
  const [drawerInitialView, setDrawerInitialView] = useState<"default" | "presupuestos">("default");
  const [actionPatient, setActionPatient] = useState<KanbanPatient | null>(null);
  const [turnoPatientId, setTurnoPatientId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  // Estado para modal de pérdida
  const [pendingDrop, setPendingDrop] = useState<{
    pacienteId: string;
    targetColumn: EtapaCRM;
  } | null>(null);

  const { mutate: updateEtapa, isPending } = useUpdateEtapaCRM();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const sortedColumns = useMemo(
    () =>
      [...columns]
        .filter((col) => ETAPA_ORDER.includes(col.etapa as EtapaCRM))
        .sort(
          (a, b) =>
            ETAPA_ORDER.indexOf(a.etapa as EtapaCRM) -
            ETAPA_ORDER.indexOf(b.etapa as EtapaCRM)
        ),
    [columns]
  );

  const TEMP_ORDER: Record<string, number> = { CALIENTE: 0, TIBIO: 1, FRIO: 2 };

  const displayedColumns = useMemo(() => {
    const cols = applyPendingMoves(sortedColumns, pendingMoves);
    return cols.map((col) => ({
      ...col,
      pacientes: [...col.pacientes].sort(
        (a, b) =>
          (TEMP_ORDER[a.temperatura ?? ""] ?? 3) -
          (TEMP_ORDER[b.temperatura ?? ""] ?? 3)
      ),
    }));
  }, [sortedColumns, pendingMoves]);

  const pendingPatientIds = useMemo(
    () => new Set(Object.keys(pendingMoves)),
    [pendingMoves]
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
      setPendingDrop({ pacienteId: patient.id, targetColumn });
      return;
    }

    // Mover optimistamente
    setPendingMoves((prev) => ({ ...prev, [patient.id]: targetColumn }));
    updateEtapa(
      { pacienteId: patient.id, etapaCRM: targetColumn },
      {
        onSettled: () =>
          setPendingMoves((prev) => {
            const next = { ...prev };
            delete next[patient.id];
            return next;
          }),
        onError: () =>
          toast.error("No se pudo mover el paciente. Verificá los requisitos."),
      }
    );
  }

  function handleLossConfirm(motivo: MotivoPerdidaCRM) {
    if (!pendingDrop) return;
    const { pacienteId } = pendingDrop;
    setPendingDrop(null);

    // Mover optimistamente
    setPendingMoves((prev) => ({ ...prev, [pacienteId]: "PERDIDO" }));
    updateEtapa(
      { pacienteId, etapaCRM: "PERDIDO", motivoPerdida: motivo },
      {
        onSettled: () =>
          setPendingMoves((prev) => {
            const next = { ...prev };
            delete next[pacienteId];
            return next;
          }),
        onSuccess: () => toast.success("Paciente marcado como perdido"),
        onError: () => toast.error("No se pudo actualizar el estado"),
      }
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Wrapper con sombras laterales y scrollbar visible */}
        <div className="relative w-full min-w-0">
          {/* Sombra izquierda */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 transition-opacity duration-200"
            style={{
              opacity: canScrollLeft ? 1 : 0,
              background: "linear-gradient(to right, rgba(0,0,0,0.08), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            }}
          />
          {/* Sombra derecha */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 transition-opacity duration-200"
            style={{
              opacity: canScrollRight ? 1 : 0,
              background: "linear-gradient(to left, rgba(0,0,0,0.08), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            }}
          />

          {/* Área scrolleable */}
          <div
            ref={scrollRef}
            className="w-full min-w-0 overflow-x-auto pb-3"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
          >
            <div className="flex gap-3 min-h-[500px] pb-1" style={{ width: "max-content" }}>
              {displayedColumns.map((col) => (
                <KanbanColumn
                  key={col.etapa}
                  column={col}
                  unreadMap={unreadMap}
                  pendingPatientIds={pendingPatientIds}
                  onOpenDrawer={(id) => {
                    setDrawerInitialView("default");
                    setDrawerPatientId(id);
                  }}
                  onOpenActions={(p) => setActionPatient(p)}
                />
              ))}
            </div>
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

      <CardActionsSheet
        open={!!actionPatient}
        onOpenChange={(v) => { if (!v) setActionPatient(null); }}
        patient={actionPatient}
        onOpenDrawer={(id) => {
          setDrawerInitialView("default");
          setDrawerPatientId(id);
        }}
        onOpenNuevoTurno={(id) => setTurnoPatientId(id)}
        onOpenPresupuestos={(id) => {
          setDrawerInitialView("presupuestos");
          setDrawerPatientId(id);
        }}
      />

      <PatientDrawer
        open={!!drawerPatientId}
        onOpenChange={(v) => { if (!v) setDrawerPatientId(null); }}
        pacienteId={drawerPatientId}
        initialView={drawerInitialView}
      />

      {turnoPatientId && (
        <NuevoTurnoModal
          open={!!turnoPatientId}
          onOpenChange={(v) => { if (!v) setTurnoPatientId(null); }}
          pacienteId={turnoPatientId}
        />
      )}
    </>
  );
}
