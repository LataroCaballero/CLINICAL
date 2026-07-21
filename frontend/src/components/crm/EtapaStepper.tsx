"use client";

import { CalendarPlus, CheckCircle, ExternalLink, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETAPA_LABELS, EtapaCRM, PasosCrm, KanbanPatient } from "@/hooks/useCRMKanban";

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

// D-02: Mapeo paso→etapa para los 3 nodos mapeados (estado de paso gobierna coloreo)
const PASO_POR_ETAPA: Partial<Record<EtapaCRM, keyof PasosCrm>> = {
  CONSULTADO: "hc",
  PRESUPUESTO_ENVIADO: "presupuesto",
  CONFIRMADO: "cirugia",
};

interface EtapaStepperProps {
  etapaActual: EtapaCRM | null;
  optimisticEtapa?: EtapaCRM | null; // for visual display only
  onClickEtapa?: (etapa: EtapaCRM) => void;
  onPresupuestoClick?: () => void;
  onHCClick?: () => void;
  pasos?: PasosCrm;
  flujo?: KanbanPatient["flujo"];
  onCirugiaClick?: () => void;
  // Phase 62 (INDIC-05) — display-only fecha de lectura de indicaciones.
  // NO gobierna el coloreo del dot (eso sigue siendo pasos.indicacionesPreop).
  indicacionesLeidasAt?: string | null;
}

export function EtapaStepper({
  etapaActual,
  optimisticEtapa,
  onClickEtapa,
  onPresupuestoClick,
  onHCClick,
  pasos,
  flujo,
  onCirugiaClick,
  indicacionesLeidasAt,
}: EtapaStepperProps) {
  const displayEtapa = optimisticEtapa ?? etapaActual;

  // activeIndex uses displayEtapa for visual highlighting
  const activeIndex =
    displayEtapa === null || displayEtapa === "PERDIDO"
      ? -1
      : STEPPER_CHAIN.indexOf(displayEtapa);

  const esPerdido = displayEtapa === "PERDIDO";

  // D-05: client-side filtering — hide cirugia action and sub-indicators for TRATAMIENTO flow
  // Edge case PENDIENTE/null → behave like CIRUGIA (show everything)
  const esTratamiento = flujo === "TRATAMIENTO";

  return (
    <div className="flex flex-col">
      {STEPPER_CHAIN.map((etapa, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === STEPPER_CHAIN.length - 1;

        // Non-clickable: the REAL current etapa (not the optimistic one)
        const isActualCurrent = etapa === etapaActual;
        const isClickable = !!onClickEtapa && !isActualCurrent;

        // D-02: derive step state for mapped nodes
        const pasoKey = PASO_POR_ETAPA[etapa];
        const pasoEstado = pasoKey && pasos ? pasos[pasoKey] : undefined;
        const esNodoMapeado = !!pasoEstado;

        // D-03: for mapped nodes, step state gates button visibility
        // button only renders when pasoEstado === 'pendiente'
        const showHCButton =
          etapa === "CONSULTADO" &&
          !!onHCClick &&
          pasos?.hc === "pendiente";
        const showPresupuestoButton =
          etapa === "PRESUPUESTO_ENVIADO" &&
          !!onPresupuestoClick &&
          pasos?.presupuesto === "pendiente";
        // D-05: cirugia button hidden when flujo === 'TRATAMIENTO'
        const showCirugiaButton =
          etapa === "CONFIRMADO" &&
          !!onCirugiaClick &&
          pasos?.cirugia === "pendiente" &&
          !esTratamiento;

        // D-04: sub-indicators for consentimiento/indicaciones under CONFIRMADO
        // D-05: hidden when flujo === 'TRATAMIENTO'
        const showSubIndicadores =
          etapa === "CONFIRMADO" && !!pasos && !esTratamiento;

        const hasContextualButton =
          showHCButton ||
          showPresupuestoButton ||
          showCirugiaButton ||
          showSubIndicadores ||
          (etapa === "PROCEDIMIENTO_REALIZADO" &&
            !!onClickEtapa &&
            displayEtapa !== "PROCEDIMIENTO_REALIZADO");

        // D-03: for mapped nodes, circle color is driven by step state (not funnel position)
        // For unmapped nodes, preserve the original funnel-based coloring
        const circleClass = cn(
          "h-5 w-5 rounded-full border-2 flex-shrink-0",
          esNodoMapeado
            ? pasoEstado === "completo"
              ? "border-green-500 bg-green-500"
              : "border-orange-500 bg-orange-500"
            : isCurrent
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

              {/* PRESUPUESTO_ENVIADO — only shown when paso === 'pendiente' (D-03) */}
              {showPresupuestoButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPresupuestoClick!();
                  }}
                  className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver/Crear presupuesto
                </button>
              )}

              {/* CONSULTADO — only shown when paso === 'pendiente' (D-03) */}
              {showHCButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHCClick!();
                  }}
                  className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
                >
                  <FilePlus className="h-3 w-3" />
                  Registrar HC
                </button>
              )}

              {/* CONFIRMADO — "Agendar cirugía" only when paso === 'pendiente' and not TRATAMIENTO (STEPPER-05/06, D-10) */}
              {showCirugiaButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCirugiaClick!();
                  }}
                  className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
                >
                  <CalendarPlus className="h-3 w-3" />
                  Agendar cirugía
                </button>
              )}

              {/* CONFIRMADO — sub-indicadores consentimiento/indicaciones (D-04, visual-only, no button) */}
              {showSubIndicadores && (
                <div className="mb-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        pasos!.consentimiento === "completo"
                          ? "bg-green-500"
                          : "bg-orange-500"
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      Consentimiento
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        pasos!.indicacionesPreop === "completo"
                          ? "bg-green-500"
                          : "bg-orange-500"
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      Indicaciones preop
                      {indicacionesLeidasAt &&
                        ` · leídas ${new Date(indicacionesLeidasAt).toLocaleDateString("es-AR")}`}
                    </span>
                  </div>
                </div>
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
