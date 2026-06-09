"use client";

import { CheckCircle, ExternalLink, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETAPA_LABELS, EtapaCRM } from "@/hooks/useCRMKanban";

// Stepper shows 7 steps including PROCEDIMIENTO_REALIZADO (not in ETAPA_ORDER — that's for kanban only)
const STEPPER_CHAIN: EtapaCRM[] = [
  "SIN_CLASIFICAR",
  "NUEVO_LEAD",
  "TURNO_AGENDADO",
  "CONSULTADO",
  "PRESUPUESTO_ENVIADO",
  "CONFIRMADO",               // index 5 — matches ETAPA_ORDEN backend
  "PROCEDIMIENTO_REALIZADO",  // index 6 — matches ETAPA_ORDEN backend
];

interface EtapaStepperProps {
  etapaActual: EtapaCRM | null;
  optimisticEtapa?: EtapaCRM | null; // for visual display only
  onClickEtapa?: (etapa: EtapaCRM) => void;
  onPresupuestoClick?: () => void;
  onHCClick?: () => void;
}

export function EtapaStepper({
  etapaActual,
  optimisticEtapa,
  onClickEtapa,
  onPresupuestoClick,
  onHCClick,
}: EtapaStepperProps) {
  const displayEtapa = optimisticEtapa ?? etapaActual;

  // activeIndex uses displayEtapa for visual highlighting
  const activeIndex =
    displayEtapa === null || displayEtapa === "PERDIDO"
      ? -1
      : STEPPER_CHAIN.indexOf(displayEtapa);

  const esPerdido = displayEtapa === "PERDIDO";

  return (
    <div className="flex flex-col">
      {STEPPER_CHAIN.map((etapa, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === STEPPER_CHAIN.length - 1;

        // Non-clickable: the REAL current etapa (not the optimistic one)
        const isActualCurrent = etapa === etapaActual;
        const isClickable = !!onClickEtapa && !isActualCurrent;

        const hasContextualButton =
          (etapa === "PRESUPUESTO_ENVIADO" && !!onPresupuestoClick) ||
          (etapa === "CONSULTADO" && !!onHCClick) ||
          (etapa === "PROCEDIMIENTO_REALIZADO" &&
            !!onClickEtapa &&
            displayEtapa !== "PROCEDIMIENTO_REALIZADO");

        const circleClass = cn(
          "h-5 w-5 rounded-full border-2 flex-shrink-0",
          isCurrent
            ? "border-primary bg-primary"
            : isDone
            ? "border-primary/40 bg-primary/10"
            : "border-gray-300 bg-transparent"
        );

        const labelClass = cn(
          "pt-0.5",
          hasContextualButton ? "pb-1" : "pb-3",
          isCurrent
            ? "text-sm font-semibold text-foreground"
            : "text-sm text-muted-foreground"
        );

        return (
          <div
            key={etapa}
            className={cn(
              "flex items-start gap-3 rounded-md px-1 -mx-1",
              isClickable && "cursor-pointer",
              isClickable && "hover:bg-muted/50"
            )}
            onClick={isClickable ? () => onClickEtapa!(etapa) : undefined}
          >
            {/* Left column: circle + connector */}
            <div className="flex flex-col items-center">
              <div className={circleClass} />
              {!isLast && (
                <div className="w-0.5 flex-1 min-h-[24px] bg-gray-200 mt-1" />
              )}
            </div>

            {/* Right column: label + optional contextual button */}
            <div className="flex flex-col">
              <span className={labelClass}>{ETAPA_LABELS[etapa]}</span>

              {etapa === "PRESUPUESTO_ENVIADO" && onPresupuestoClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPresupuestoClick();
                  }}
                  className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver/Crear presupuesto
                </button>
              )}

              {etapa === "CONSULTADO" && onHCClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHCClick();
                  }}
                  className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
                >
                  <FilePlus className="h-3 w-3" />
                  Registrar HC
                </button>
              )}

              {etapa === "PROCEDIMIENTO_REALIZADO" &&
                onClickEtapa &&
                displayEtapa !== "PROCEDIMIENTO_REALIZADO" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickEtapa("PROCEDIMIENTO_REALIZADO");
                    }}
                    className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Marcar como realizado
                  </button>
                )}
            </div>
          </div>
        );
      })}

      {/* Dashed divider before PERDIDO */}
      <div className="my-2 border-t border-dashed border-gray-200" />

      {/* PERDIDO node — no connector line, destructive hover */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-md px-1 -mx-1",
          !!onClickEtapa &&
            etapaActual !== "PERDIDO" &&
            "cursor-pointer hover:bg-red-50"
        )}
        onClick={
          onClickEtapa && etapaActual !== "PERDIDO"
            ? () => onClickEtapa("PERDIDO")
            : undefined
        }
      >
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "h-5 w-5 rounded-full border-2 flex-shrink-0",
              esPerdido
                ? "border-red-500 bg-red-500"
                : "border-gray-200 bg-transparent"
            )}
          />
        </div>
        <span
          className={cn(
            "pt-0.5",
            esPerdido
              ? "text-sm font-semibold text-red-600"
              : "text-sm text-gray-300"
          )}
        >
          {ETAPA_LABELS["PERDIDO"]}
        </span>
      </div>
    </div>
  );
}
