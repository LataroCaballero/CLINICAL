"use client";

import { useDraggable } from "@dnd-kit/core";
import { KanbanPatient } from "@/hooks/useCRMKanban";
import { TemperatureSelector } from "./TemperatureSelector";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/useUIStore";

const TEMP_ICON: Record<string, string> = {
  CALIENTE: "🔥",
  TIBIO: "🌡️",
  FRIO: "🧊",
};

function formatMoney(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function formatTimeSince(fecha: string): string {
  const diffMs = Date.now() - new Date(fecha).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function contactBadgeColor(fecha: string): string {
  const days = (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24);
  if (days > 7) return "bg-red-100 text-red-700";
  if (days > 3) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

interface Props {
  patient: KanbanPatient;
  columnId: string;
  unreadWA?: number;
  isPending?: boolean;
  onOpenDrawer?: (pacienteId: string) => void;
  onOpenActions?: (patient: KanbanPatient) => void;
}

export function PatientCard({ patient, columnId, unreadWA = 0, isPending = false, onOpenDrawer, onOpenActions }: Props) {
  const { focusModeEnabled: fm } = useUIStore();
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
        "relative rounded-lg border p-3 shadow-sm cursor-grab select-none transition-all",
        fm
          ? "bg-[var(--fc-bg-primary)] border-[var(--fc-border)] hover:border-slate-500 hover:shadow-md"
          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md",
        isDragging && "opacity-40 shadow-lg rotate-2 cursor-grabbing",
        isPending && "opacity-55 grayscale-[40%] pointer-events-none border-dashed"
      )}
      onClick={() => !isDragging && onOpenActions?.(patient)}
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
          className={cn("text-sm font-medium text-left leading-tight", fm ? "text-[var(--fc-text-primary)] hover:text-violet-400" : "text-gray-900 hover:text-blue-600")}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer?.(patient.id);
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
        <p className={cn("text-xs mt-1 truncate", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-500")}>
          {patient.procedimiento}
        </p>
      )}

      {/* Presupuesto + badge último contacto */}
      <div className="flex items-center justify-between mt-2">
        {patient.presupuesto ? (
          <span className={cn("text-xs font-semibold", fm ? "text-[var(--fc-text-primary)]" : "text-gray-700")}>
            {formatMoney(patient.presupuesto.total)}
          </span>
        ) : (
          <span />
        )}
        {patient.ultimoContactoFecha && (
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full", contactBadgeColor(patient.ultimoContactoFecha))}>
            {formatTimeSince(patient.ultimoContactoFecha)}
          </span>
        )}
      </div>

      {/* Lista de espera badge */}
      {patient.enListaEspera && (
        <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-1.5 py-0.5 rounded border border-amber-400 text-amber-600 font-medium">
          ⏰ Espera
        </span>
      )}

      {/* Autorización pendiente badge */}
      {(patient.pendingAutorizaciones ?? 0) > 0 && (
        <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-1.5 py-0.5 rounded border border-purple-400 text-purple-600 font-medium">
          🛡 Aut. pendiente ({patient.pendingAutorizaciones})
        </span>
      )}

      {/* Última interacción */}
      {patient.ultimoContactoNota && (
        <p className={cn("text-xs mt-1.5 italic", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-400")}>
          {patient.ultimoContactoNota.length > 45
            ? patient.ultimoContactoNota.slice(0, 45) + "..."
            : patient.ultimoContactoNota}
        </p>
      )}
    </div>
  );
}
