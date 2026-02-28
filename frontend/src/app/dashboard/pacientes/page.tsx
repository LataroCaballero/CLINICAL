"use client";

import { useState } from "react";
import { PacientesDataTable } from "./components/PacientesDataTable";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { CRMMetricsBar } from "@/components/crm/CRMMetricsBar";
import { useCRMKanban } from "@/hooks/useCRMKanban";
import { useCRMMetrics } from "@/hooks/useCRMMetrics";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useWAUnread } from "@/hooks/useWAThread";
import { Button } from "@/components/ui/button";
import { LayoutList, Kanban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Vista = "lista" | "embudo";
const STORAGE_KEY = "pacientes-vista";

export default function PacientesPage() {
  const [vista, setVista] = useState<Vista>(() => {
    if (typeof window === "undefined") return "lista";
    return (localStorage.getItem(STORAGE_KEY) as Vista) ?? "lista";
  });

  const efectiveProfesionalId = useEffectiveProfessionalId();

  const { data: kanban, isLoading: kanbanLoading } = useCRMKanban(
    vista === "embudo" ? efectiveProfesionalId : null
  );
  const { data: metrics, isLoading: metricsLoading } = useCRMMetrics(
    vista === "embudo" ? efectiveProfesionalId : null
  );
  // WA unread map — polled every 30s — passed to list and kanban for badge display
  const { data: waUnreadMap } = useWAUnread();

  function cambiarVista(v: Vista) {
    setVista(v);
    localStorage.setItem(STORAGE_KEY, v);
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full overflow-x-hidden">
      {/* Header con toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Pacientes</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={vista === "lista" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => cambiarVista("lista")}
          >
            <LayoutList size={15} />
            Lista
          </Button>
          <Button
            variant={vista === "embudo" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => cambiarVista("embudo")}
          >
            <Kanban size={15} />
            Embudo
          </Button>
        </div>
      </div>

      {/* Vista Lista */}
      {vista === "lista" && <PacientesDataTable unreadMap={waUnreadMap} />}

      {/* Vista Embudo / CRM Kanban */}
      {vista === "embudo" && (
        <div className="flex flex-col gap-4 min-w-0 w-full">
          {!efectiveProfesionalId ? (
            <div className="bg-white rounded-xl border p-8 text-center text-muted-foreground">
              Seleccioná un profesional para ver el embudo CRM.
            </div>
          ) : (
            <div className="flex flex-col gap-4 min-w-0 w-full">
              {/* Métricas — ancho completo, no expande la página */}
              <div className="w-full">
                <CRMMetricsBar metrics={metrics} isLoading={metricsLoading} />
              </div>

              {/* Kanban — scroll horizontal interno */}
              {kanbanLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-64 w-[220px] shrink-0 rounded-xl" />
                  ))}
                </div>
              ) : kanban ? (
                <KanbanBoard columns={kanban} unreadMap={waUnreadMap} />
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
