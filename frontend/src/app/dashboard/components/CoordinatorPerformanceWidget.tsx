"use client";
import { useCoordinatorPerformance } from "@/hooks/useCoordinatorPerformance";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { usePeriodoFilter } from "@/hooks/usePeriodoFilter";
import { PeriodoSelector } from "@/components/crm/PeriodoSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CoordinatorPerformanceWidget() {
  const { data: user } = useCurrentUser();
  const profId = useEffectiveProfessionalId();
  const [periodo, setPeriodo] = usePeriodoFilter(
    "coordinator-performance-periodo",
    "semana"
  );
  const { data, isLoading } = useCoordinatorPerformance(profId, periodo);

  // Solo visible para PROFESIONAL y ADMIN (vista gerencial)
  if (user && user.rol !== "PROFESIONAL" && user.rol !== "ADMIN") return null;

  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Performance de seguimiento
        </h3>
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
      </div>
      {!data || data.coordinadores.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">
          Sin interacciones registradas en el período
        </p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2 font-medium text-gray-500">
                Nombre
              </th>
              <th className="text-right pb-2 font-medium text-gray-500">
                Interacciones
              </th>
              <th className="text-right pb-2 font-medium text-gray-500">
                Pacientes contactados
              </th>
              <th className="text-right pb-2 font-medium text-gray-500">
                % Conversión
              </th>
            </tr>
          </thead>
          <tbody>
            {data.coordinadores.map((coord) => (
              <tr key={coord.nombre} className="border-b last:border-0">
                <td className="py-2 text-gray-700">{coord.nombre}</td>
                <td className="py-2 text-right text-gray-800 font-medium">
                  {coord.interacciones}
                </td>
                <td className="py-2 text-right text-gray-800 font-medium">
                  {coord.pacientesContactados}
                </td>
                <td className="py-2 text-right font-medium">
                  {coord.porcentajeConversion != null ? (
                    <span className="text-emerald-600">
                      {coord.porcentajeConversion}%
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
