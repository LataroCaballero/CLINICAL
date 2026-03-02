"use client";

import { useEffect, useRef } from "react";
import KpiCard from "./components/KpiCard";
import UpcomingAppointments from "./components/UpcomingAppointments";
import AlertsWidget from "./components/AlertsWidget";
import MensajesDashboard from "./components/MensajesDashboard";
import NextPatientCard from "./components/NextPatientCard";
import ActiveSessionBanner from "./components/ActiveSessionBanner";
import QuickActionsWidget from "./components/QuickActionsWidget";
import CRMKpiCards from "./components/CRMKpiCards";
import CRMFunnelWidget from "./components/CRMFunnelWidget";
import LossReasonsWidget from "./components/LossReasonsWidget";
import PipelineIncomeWidget from "./components/PipelineIncomeWidget";
import CoordinatorPerformanceWidget from "./components/CoordinatorPerformanceWidget";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useLiveTurnoStore } from "@/store/live-turno.store";
import { useReportesDashboard } from "@/hooks/useReportesDashboard";
import { useFinanzasDashboard } from "@/hooks/useFinanzas";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import { PeriodoSelector } from "@/components/crm/PeriodoSelector";
import { toast } from "sonner";

function formatARS(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export default function DashboardPage() {
  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { data: reportes, isLoading: reportesLoading } = useReportesDashboard();
  const { data: finanzas, isLoading: finanzasLoading } = useFinanzasDashboard();
  const kpisLoading = reportesLoading || finanzasLoading;
  const { focusModeEnabled, setFocusMode } = useUIStore();
  const session = useLiveTurnoStore((state) => state.session);
  const isMinimized = useLiveTurnoStore((state) => state.isMinimized);
  const [kpiPeriodo, setKpiPeriodo] = usePeriodoFilter("crm-kpis-periodo", "mes");

  // Track whether focus mode was auto-activated by a LiveTurno session
  const autoActivatedRef = useRef(false);

  // Auto-activate focus mode when LiveTurno session is minimized
  useEffect(() => {
    if (session && isMinimized && !focusModeEnabled) {
      autoActivatedRef.current = true;
      setFocusMode(true);
      toast("Modo Consulta activado", {
        description: "La interfaz se adaptó para tu consulta.",
        action: {
          label: "Desactivar",
          onClick: () => {
            autoActivatedRef.current = false;
            setFocusMode(false);
          },
        },
      });
    }
    // Only auto-deactivate if it was auto-activated by a session
    if (!session && focusModeEnabled && autoActivatedRef.current) {
      autoActivatedRef.current = false;
      setFocusMode(false);
    }
  }, [session, isMinimized, focusModeEnabled, setFocusMode]);

  // ── Focus mode layout ──
  if (focusModeEnabled) {
    return (
      <div className="flex-1 flex flex-col p-6 space-y-4 min-h-full">
        {/* Active session banner */}
        <ActiveSessionBanner />

        {/* Next patient card */}
        {effectiveProfessionalId && (
          <NextPatientCard profesionalId={effectiveProfessionalId} />
        )}

        {/* Full-width appointments */}
        {effectiveProfessionalId ? (
          <UpcomingAppointments profesionalId={effectiveProfessionalId} />
        ) : (
          <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
            Seleccioná un profesional para ver turnos.
          </div>
        )}
      </div>
    );
  }

  // ── Normal layout ──
  return (
    <div className="relative">
      <div className="flex bg-transparent text-gray-800 flex-col">
        <div className="flex-1 flex flex-col p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left column: KPIs + Appointments */}
            <div className="md:col-span-8 space-y-6">
              {/* Bloque KPIs CRM con su selector de período propio */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600">
                    Métricas de conversión
                  </h3>
                  <PeriodoSelector value={kpiPeriodo} onChange={setKpiPeriodo} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CRMKpiCards isLoading={kpisLoading} periodo={kpiPeriodo} />
                </div>
              </div>

              {/* Mini-embudo del mes — trapecio */}
              <CRMFunnelWidget />

              {/* Dashboard de conversión — segunda fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LossReasonsWidget />
                <PipelineIncomeWidget />
              </div>

              {/* Performance del coordinador */}
              <CoordinatorPerformanceWidget />

              {/* KPIs financieros — tercera fila */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  title="Fact. mensual"
                  value={formatARS(finanzas?.ingresosMes ?? 0)}
                  subtitle="acumulado del mes"
                  isLoading={kpisLoading}
                />
                <KpiCard
                  title="Ingresos hoy"
                  value={formatARS(finanzas?.ingresosHoy ?? 0)}
                  subtitle="cobrados hoy"
                  isLoading={kpisLoading}
                />
                <KpiCard
                  title="Turnos hoy"
                  value={String(reportes?.turnosHoy ?? 0)}
                  change={`${reportes?.turnosCompletados ?? 0} completados`}
                  trend="neutral"
                  subtitle="programados para hoy"
                  isLoading={kpisLoading}
                />
                <KpiCard
                  title="Pendientes"
                  value={String(reportes?.turnosPendientes ?? 0)}
                  change={reportes?.turnosAusentes ? `${reportes.turnosAusentes} ausentes` : undefined}
                  trend={reportes?.turnosAusentes ? "down" : "neutral"}
                  subtitle="por atender hoy"
                  isLoading={kpisLoading}
                />
              </div>

              {/* Upcoming appointments */}
              {effectiveProfessionalId ? (
                <UpcomingAppointments
                  profesionalId={effectiveProfessionalId}
                />
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center text-muted-foreground">
                  Seleccioná un profesional para ver turnos y agendar citas.
                </div>
              )}
            </div>

            {/* Right column widgets */}
            <div className="md:col-span-4 space-y-6">
              <QuickActionsWidget />
              <AlertsWidget />
              <MensajesDashboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
