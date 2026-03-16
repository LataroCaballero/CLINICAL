"use client";
import { useCRMLossReasons } from "@/hooks/useCRMLossReasons";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import { PeriodoSelector } from "@/components/crm/PeriodoSelector";
import { Skeleton } from "@/components/ui/skeleton";

const MOTIVO_LABELS: Record<string, string> = {
  PRECIO: "Precio",
  TIEMPO: "Tiempo",
  MIEDO_CIRUGIA: "Miedo a cirugía",
  PREFIERE_OTRO_PROFESIONAL: "Otro profesional",
  NO_CANDIDATO_MEDICO: "No candidato médico",
  NO_RESPONDIO: "Sin respuesta",
  OTRO: "Otro",
  SIN_MOTIVO: "Sin motivo registrado",
};

export default function LossReasonsWidget() {
  const profId = useEffectiveProfessionalId();
  const [periodo, setPeriodo] = usePeriodoFilter(
    "crm-loss-reasons-periodo",
    "mes"
  );
  const { data, isLoading } = useCRMLossReasons(profId, periodo);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Motivos de pérdida
        </h3>
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
      </div>
      {!data || data.total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Sin pacientes perdidos en el período
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">
            {data.total} pacientes perdidos
          </p>
          {data.motivos.map((m) => (
            <div key={m.motivo} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">
                    {MOTIVO_LABELS[m.motivo] ?? m.motivo}
                  </span>
                  <span className="font-medium text-gray-800">
                    {m.porcentaje}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${m.porcentaje}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-6 text-right">
                {m.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
