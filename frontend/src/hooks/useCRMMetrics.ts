import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CRMMetrics {
  periodo: { inicio: string; fin: string };
  presupuestosEnviados: number;
  confirmados: number;
  perdidos: number;
  tasaConversion: number;
  calientes: number;
  tibios: number;
  frios: number;
  tiempoPromedioDecisionDias: number;
  ingresoProyectado: number;
  distribucionEtapas: Record<string, number>;
  enListaEspera: number;
}

export function useCRMMetrics(
  profesionalId: string | null,
  mes?: string,
) {
  return useQuery<CRMMetrics>({
    queryKey: ["crm-metrics", profesionalId, mes],
    queryFn: async () => {
      const { data } = await api.get("/reportes/crm", {
        params: { profesionalId, mes },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 60_000,
  });
}
