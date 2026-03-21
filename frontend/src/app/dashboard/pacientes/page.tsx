"use client";

import { useState } from "react";
import { PacientesDataTable } from "./components/PacientesDataTable";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { CRMMetricsBar } from "@/components/crm/CRMMetricsBar";
import { ListaEsperaSheet } from "@/components/crm/ListaEsperaSheet";
import { AutorizacionesSheet } from "@/components/crm/AutorizacionesSheet";
import { useAutorizacionesPendientes } from "@/hooks/useAutorizaciones";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCRMKanban } from "@/hooks/useCRMKanban";
import { useCRMMetrics } from "@/hooks/useCRMMetrics";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useWAUnread } from "@/hooks/useWAThread";
import { Button } from "@/components/ui/button";
import { LayoutList, Kanban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";

type Vista = "lista" | "embudo";
const STORAGE_KEY = "pacientes-vista";

export default function PacientesPage() {
  const [listaEsperaOpen, setListaEsperaOpen] = useState(false);
  const [autorizacionesOpen, setAutorizacionesOpen] = useState(false);
  const [vista, setVista] = useState<Vista>(() => {
    if (typeof window === "undefined") return "lista";
    return (localStorage.getItem(STORAGE_KEY) as Vista) ?? "embudo";
  });

  const efectiveProfesionalId = useEffectiveProfessionalId();
  const { focusModeEnabled: fm } = useUIStore();

  const { data: autPendientes } = useAutorizacionesPendientes(efectiveProfesionalId);

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
      <div className="flex items-center justify-between gap-3">
        <h1 className={cn("text-2xl font-semibold", fm ? "text-[var(--fc-text-primary)]" : "text-gray-800")}>Pacientes</h1>
        <div className="flex items-center gap-2 ml-auto">
          {/* Autorizaciones pendientes */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
            onClick={() => setAutorizacionesOpen(true)}
          >
            <ShieldCheck className="h-4 w-4" />
            Autorizaciones
            {(autPendientes?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700 px-1.5 py-0 text-xs">
                {autPendientes!.length}
              </Badge>
            )}
          </Button>
        </div>
        <div className={cn("flex items-center gap-1 rounded-lg p-1", fm ? "bg-[var(--fc-bg-surface)]" : "bg-gray-100")}>
          <Button
            variant={vista === "embudo" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 gap-1.5",
              vista !== "embudo" && fm && "text-[var(--fc-text-secondary)] hover:bg-[var(--fc-bg-hover)] hover:text-[var(--fc-text-primary)]"
            )}
            onClick={() => cambiarVista("embudo")}
          >
            <Kanban size={15} />
            Embudo
          </Button>
          <Button
            variant={vista === "lista" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 gap-1.5",
              vista !== "lista" && fm && "text-[var(--fc-text-secondary)] hover:bg-[var(--fc-bg-hover)] hover:text-[var(--fc-text-primary)]"
            )}
            onClick={() => cambiarVista("lista")}
          >
            <LayoutList size={15} />
            Lista
          </Button>
        </div>
      </div>

      {/* Vista Lista */}
      {vista === "lista" && <PacientesDataTable unreadMap={waUnreadMap} />}

      {/* Vista Embudo / CRM Kanban */}
      {vista === "embudo" && (
        <div className="flex flex-col gap-4 min-w-0 w-full">
          {!efectiveProfesionalId ? (
            <div className={cn("rounded-xl border p-8 text-center text-muted-foreground", fm ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-secondary)]" : "bg-white")}>
              Seleccioná un profesional para ver el embudo CRM.
            </div>
          ) : (
            <div className="flex flex-col gap-4 min-w-0 w-full">
              {/* Métricas — ancho completo, no expande la página */}
              <div className="w-full">
                <CRMMetricsBar
                  metrics={metrics}
                  isLoading={metricsLoading}
                  onClickListaEspera={() => setListaEsperaOpen(true)}
                />
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
      <ListaEsperaSheet
        open={listaEsperaOpen}
        onOpenChange={setListaEsperaOpen}
        profesionalId={efectiveProfesionalId}
      />
      <AutorizacionesSheet
        open={autorizacionesOpen}
        onOpenChange={setAutorizacionesOpen}
        profesionalId={efectiveProfesionalId}
      />
    </div>
  );
}
