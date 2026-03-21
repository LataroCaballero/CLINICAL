"use client";

import { CRMMetrics } from "@/hooks/useCRMMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, CheckCircle, Flame, Clock } from "lucide-react";
import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return "$" + Math.round(n).toLocaleString("es-AR");
}

interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  onClick?: () => void;
}

function MetricTile({ icon, label, value, sub, color = "text-gray-700", onClick }: MetricTileProps) {
  const { focusModeEnabled: fm } = useUIStore();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        fm ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)]" : "bg-white",
        onClick && "cursor-pointer hover:shadow-md transition-shadow"
      )}
      onClick={onClick}
    >
      <div className={`${color} shrink-0`}>{icon}</div>
      <div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        <div className={cn("text-xs", fm ? "text-[var(--fc-text-secondary)]" : "text-gray-500")}>{label}</div>
        {sub && <div className={cn("text-xs", fm ? "text-slate-500" : "text-gray-400")}>{sub}</div>}
      </div>
    </div>
  );
}

interface Props {
  metrics: CRMMetrics | undefined;
  isLoading: boolean;
  onClickListaEspera?: () => void;
}

export function CRMMetricsBar({ metrics, isLoading, onClickListaEspera }: Props) {
  if (isLoading) {
    return (
      <div className="flex gap-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <MetricTile
        icon={<TrendingUp size={20} />}
        label="Tasa de conversión"
        value={`${metrics.tasaConversion}%`}
        sub={`${metrics.confirmados} de ${metrics.presupuestosEnviados} presupuestos`}
        color="text-emerald-600"
      />
      <MetricTile
        icon={<Flame size={20} />}
        label="Pacientes calientes"
        value={String(metrics.calientes)}
        sub={`${metrics.tibios} tibios · ${metrics.frios} fríos`}
        color="text-red-500"
      />
      <MetricTile
        icon={<CheckCircle size={20} />}
        label="Cirugías confirmadas"
        value={String(metrics.confirmados)}
        sub="este período"
        color="text-blue-600"
      />
      <MetricTile
        icon={<Users size={20} />}
        label="Ingreso proyectado"
        value={formatMoney(metrics.ingresoProyectado)}
        sub="presupuestos enviados"
        color="text-violet-600"
      />
      <MetricTile
        icon={<Clock size={20} />}
        label="En lista de espera"
        value={String(metrics.enListaEspera)}
        sub="quieren adelantar turno"
        color="text-amber-600"
        onClick={onClickListaEspera}
      />
    </div>
  );
}
