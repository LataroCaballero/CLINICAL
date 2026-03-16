"use client";
import KpiCard from "./KpiCard";
import { useCRMKpis } from "@/hooks/useCRMKpis";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { Periodo } from "@/hooks/usePeriodoFilter";

interface Props {
  isLoading?: boolean;
  periodo: Periodo;
}

export default function CRMKpiCards({ isLoading: parentLoading, periodo }: Props) {
  const profId = useEffectiveProfessionalId();
  const { data, isLoading } = useCRMKpis(profId, periodo);

  const loading = parentLoading || isLoading;

  return (
    <>
      <KpiCard
        title="Nuevos pacientes"
        value={data ? String(data.nuevos) : "—"}
        subtitle={`${periodo === "semana" ? "esta semana" : periodo === "mes" ? "este mes" : "este trimestre"}`}
        isLoading={loading}
      />
      <KpiCard
        title="Cirugías confirmadas"
        value={data ? String(data.confirmados) : "—"}
        subtitle="en el período"
        trend="up"
        isLoading={loading}
      />
      <KpiCard
        title="Tasa de conversión"
        value={data ? `${data.tasaConversion}%` : "—"}
        subtitle={
          data
            ? `${data.confirmados} de ${data.totalActivos} activos`
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
        title="Pacientes activos"
        value={data ? String(data.totalActivos) : "—"}
        subtitle="excluye perdidos"
        isLoading={loading}
      />
    </>
  );
}
