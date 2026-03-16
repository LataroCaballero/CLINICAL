"use client";
import { useCRMPipelineIncome } from "@/hooks/useCRMPipelineIncome";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import { PeriodoSelector } from "@/components/crm/PeriodoSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export default function PipelineIncomeWidget() {
  const { data: user } = useCurrentUser();
  const profId = useEffectiveProfessionalId();
  const [periodo, setPeriodo] = usePeriodoFilter(
    "crm-pipeline-income-periodo",
    "mes"
  );
  const { data, isLoading } = useCRMPipelineIncome(profId, periodo);

  // Solo visible para PROFESIONAL y ADMIN
  // TODO: tier gating — cuando se implemente el modelo de tiers/suscripción en ConfigClinica,
  // agregar condición: clinica.tier === 'premium'. Por ahora se usa visibilidad por rol como proxy.
  // La lógica de tier está DIFERIDA (ver 05-CONTEXT.md sección Deferred Ideas).
  if (user && user.rol !== "PROFESIONAL" && user.rol !== "ADMIN") return null;

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Pipeline potencial
        </h3>
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
      </div>
      <div className="mt-1">
        <div className="text-2xl font-bold text-emerald-600">
          {data ? formatMoney(data.total) : "—"}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {data
            ? `${data.count} presupuesto${data.count !== 1 ? "s" : ""} enviado${data.count !== 1 ? "s" : ""} · pacientes calientes`
            : "presupuestos enviados · pacientes calientes"}
        </p>
      </div>
    </div>
  );
}
