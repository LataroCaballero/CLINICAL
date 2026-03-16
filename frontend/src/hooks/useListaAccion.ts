import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ListaAccionItem {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  etapaCRM?: string | null;
  temperatura?: string | null;
  diasSinContacto: number;
  score: number;
  ultimoContactoFecha?: string | null;
}

export interface ListaAccionResponse {
  items: ListaAccionItem[];
  contactadosHoy: number;
  total: number;
}

export function useListaAccion(profesionalId?: string | null) {
  return useQuery<ListaAccionResponse>({
    queryKey: ["lista-accion", profesionalId],
    queryFn: async () => {
      const params = profesionalId ? `?profesionalId=${profesionalId}` : "";
      const { data } = await api.get(`/pacientes/lista-accion${params}`);
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 60_000, // 1 minuto — la lista no cambia muy frecuentemente
    refetchOnWindowFocus: true,
  });
}
