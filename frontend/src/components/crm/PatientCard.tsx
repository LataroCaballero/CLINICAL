"use client";

import { useDraggable } from "@dnd-kit/core";
import { KanbanPatient } from "@/hooks/useCRMKanban";
import { TemperatureSelector } from "./TemperatureSelector";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TEMP_ICON: Record<string, string> = {
  CALIENTE: "🔥",
  TIBIO: "🌡️",
  FRIO: "🧊",
};

function formatMoney(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

interface Props {
  patient: KanbanPatient;
  columnId: string;
  unreadWA?: number;
}

export function PatientCard({ patient, columnId, unreadWA = 0 }: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: patient.id,
      data: { patient, fromColumn: columnId },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab select-none",
        "hover:border-gray-300 hover:shadow-md transition-all",
        isDragging && "opacity-40 shadow-lg rotate-2 cursor-grabbing"
      )}
      {...listeners}
      {...attributes}
    >
      {/* WA unread badge — shown when patient has unread inbound messages */}
      {unreadWA > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] text-white font-bold leading-none z-10">
          {unreadWA}
        </span>
      )}

      {/* Header: nombre + temperatura */}
      <div className="flex items-start justify-between gap-1">
        <button
          className="text-sm font-medium text-gray-900 text-left hover:text-blue-600 leading-tight"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/pacientes/${patient.id}`);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {patient.nombreCompleto}
        </button>
        <span onPointerDown={(e) => e.stopPropagation()}>
          <TemperatureSelector
            pacienteId={patient.id}
            current={patient.temperatura}
          />
        </span>
      </div>

      {/* Procedimiento */}
      {patient.procedimiento && (
        <p className="text-xs text-gray-500 mt-1 truncate">
          {patient.procedimiento}
        </p>
      )}

      {/* Presupuesto */}
      {patient.presupuesto && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold text-gray-700">
            {formatMoney(patient.presupuesto.total)}
          </span>
          {patient.diasDesdePresupuesto !== null && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                patient.diasDesdePresupuesto > 10
                  ? "bg-red-100 text-red-700"
                  : patient.diasDesdePresupuesto > 5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              {patient.diasDesdePresupuesto}d
            </span>
          )}
        </div>
      )}
    </div>
  );
}
