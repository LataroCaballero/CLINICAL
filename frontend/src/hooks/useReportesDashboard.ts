import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "./useEffectiveProfessionalId";
import { DashboardKPIs } from "@/types/reportes";

/**
 * Hook para obtener los KPIs del dashboard de reportes
 */
export function useReportesDashboard() {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<DashboardKPIs>({
    queryKey: ["reportes", "dashboard", profesionalId],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/dashboard", {
        params: { profesionalId },
      });
      return data;
    },
    // Refrescar cada 5 minutos
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
