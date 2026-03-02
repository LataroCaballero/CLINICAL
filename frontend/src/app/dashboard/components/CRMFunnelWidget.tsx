"use client";
import { useCRMFunnel } from "@/hooks/useCRMFunnel";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { Skeleton } from "@/components/ui/skeleton";

const ETAPAS_LABELS: Record<string, string> = {
  NUEVO_LEAD: "Nuevo lead",
  TURNO_AGENDADO: "Turno agendado",
  CONSULTADO: "Consultado",
  PRESUPUESTO_ENVIADO: "Presupuesto enviado",
  CONFIRMADO: "Confirmado",
};

const MOTIVO_LABELS: Record<string, string> = {
  PRECIO: "Precio",
  TIEMPO: "Tiempo",
  MIEDO_CIRUGIA: "Miedo a cirugía",
  PREFIERE_OTRO_PROFESIONAL: "Otro profesional",
  NO_CANDIDATO_MEDICO: "No candidato",
  NO_RESPONDIO: "Sin respuesta",
  OTRO: "Otro",
  SIN_MOTIVO: "Sin motivo registrado",
};

export default function CRMFunnelWidget() {
  const profId = useEffectiveProfessionalId();
  const { data, isLoading } = useCRMFunnel(profId);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data) return null;

  const maxCount = Math.max(...data.etapas.map((e) => e.count), 1);

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Embudo de conversión
      </h3>
      <div className="flex gap-6">
        {/* Trapecio izquierdo */}
        <div className="flex-1 flex flex-col gap-1">
          {data.etapas.map((etapa, i) => {
            const widthPct =
              maxCount > 0
                ? Math.round((etapa.count / maxCount) * 100)
                : 0;
            const tasaPaso = data.tasasPaso[i]; // tasa HACIA esta etapa desde la anterior
            return (
              <div key={etapa.etapa}>
                {/* Tasa de paso entre etapas (antes de cada etapa excepto la primera) */}
                {i > 0 && (
                  <div className="text-center text-xs text-gray-400 py-0.5">
                    ↓{" "}
                    {tasaPaso?.tasa != null ? `${tasaPaso.tasa}%` : "—"}
                  </div>
                )}
                {/* Barra del trapecio */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 rounded flex items-center justify-center transition-all"
                    style={{
                      width: `${widthPct}%`,
                      minWidth: "2rem",
                      backgroundColor:
                        i === data.etapas.length - 1 ? "#10b981" : "#3b82f6",
                      opacity: 1 - i * 0.1,
                    }}
                  >
                    <span className="text-white text-xs font-bold px-2">
                      {etapa.count}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {ETAPAS_LABELS[etapa.etapa] ?? etapa.etapa}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tarjeta de perdidos (separada) */}
        <div className="w-40 shrink-0 border border-red-100 rounded-lg p-3 bg-red-50/50 flex flex-col gap-2">
          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            Perdidos
          </div>
          <div className="text-2xl font-bold text-red-600">
            {data.perdidos.total}
          </div>
          {data.perdidos.porMotivo.length > 0 && (
            <ul className="space-y-1">
              {data.perdidos.porMotivo.slice(0, 4).map((m) => (
                <li
                  key={m.motivo}
                  className="flex justify-between text-xs text-gray-600"
                >
                  <span>{MOTIVO_LABELS[m.motivo] ?? m.motivo}</span>
                  <span className="font-medium">{m.count}</span>
                </li>
              ))}
            </ul>
          )}
          {data.perdidos.porMotivo.length === 0 && (
            <p className="text-xs text-gray-400">Sin motivos registrados</p>
          )}
        </div>
      </div>
    </div>
  );
}
