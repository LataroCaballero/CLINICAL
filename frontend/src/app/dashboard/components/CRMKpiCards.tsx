"use client";

import KpiCard from "./KpiCard";
import { useCRMMetrics } from "@/hooks/useCRMMetrics";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return "$" + Math.round(n).toLocaleString("es-AR");
}

interface Props {
  isLoading?: boolean;
}

export default function CRMKpiCards({ isLoading: parentLoading }: Props) {
  const profId = useEffectiveProfessionalId();
  const { data, isLoading } = useCRMMetrics(profId);

  const loading = parentLoading || isLoading;

  return (
    <>
      <KpiCard
        title="Conversión del mes"
        value={data ? `${data.tasaConversion}%` : "—"}
        subtitle={
          data
            ? `${data.confirmados} de ${data.presupuestosEnviados} presupuestos`
            : "sin datos"
        }
        trend={
          data && data.tasaConversion > 30
            ? "up"
            : data && data.tasaConversion > 0
            ? "neutral"
            : "down"
        }
        isLoading={loading}
      />
      <KpiCard
        title="Presupuestos activos"
        value={
          data
            ? String(
                (data.distribucionEtapas["PRESUPUESTO_ENVIADO"] ?? 0) +
                  (data.distribucionEtapas["PROCEDIMIENTO_REALIZADO"] ?? 0)
              )
            : "—"
        }
        subtitle="en seguimiento"
        isLoading={loading}
      />
      <KpiCard
        title="Pacientes calientes"
        value={data ? String(data.calientes) : "—"}
        subtitle={data ? `${data.tibios} tibios · ${data.frios} fríos` : ""}
        trend="neutral"
        isLoading={loading}
      />
      <KpiCard
        title="Cirugías confirmadas"
        value={data ? String(data.confirmados) : "—"}
        subtitle="este mes"
        change={
          data?.ingresoProyectado
            ? `${formatMoney(data.ingresoProyectado)} proyectado`
            : undefined
        }
        trend="up"
        isLoading={loading}
      />
    </>
  );
}
