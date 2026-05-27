"use client";

import { cn } from "@/lib/utils";
import { ETAPA_LABELS, ETAPA_ORDER, EtapaCRM } from "@/hooks/useCRMKanban";

// 6-step chain: all ETAPA_ORDER entries except PERDIDO
const CHAIN = ETAPA_ORDER.filter((e) => e !== "PERDIDO");

export function EtapaStepper({ etapaActual }: { etapaActual: EtapaCRM | null }) {
  const activeIndex =
    etapaActual === null || etapaActual === "PERDIDO"
      ? -1
      : CHAIN.indexOf(etapaActual);

  const esPerdido = etapaActual === "PERDIDO";

  return (
    <div className="flex flex-col">
      {CHAIN.map((etapa, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === CHAIN.length - 1;

        const circleClass = cn(
          "h-5 w-5 rounded-full border-2 flex-shrink-0",
          isCurrent
            ? "border-primary bg-primary"
            : isDone
            ? "border-primary/40 bg-primary/10"
            : "border-gray-300 bg-transparent"
        );

        const labelClass = cn(
          "pt-0.5 pb-3",
          isCurrent
            ? "text-sm font-semibold text-foreground"
            : "text-sm text-muted-foreground"
        );

        return (
          <div key={etapa} className="flex items-start gap-3">
            {/* Left column: circle + connector */}
            <div className="flex flex-col items-center">
              <div className={circleClass} />
              {!isLast && (
                <div className="w-0.5 flex-1 min-h-[24px] bg-gray-200 mt-1" />
              )}
            </div>
            {/* Label */}
            <span className={labelClass}>{ETAPA_LABELS[etapa]}</span>
          </div>
        );
      })}

      {/* Dashed divider before PERDIDO */}
      <div className="my-2 border-t border-dashed border-gray-200" />

      {/* PERDIDO node — no connector line */}
      <div className="flex items-start gap-3">
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
