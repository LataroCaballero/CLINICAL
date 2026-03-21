import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PacienteListaEspera {
  id: string;
  nombreCompleto: string;
  telefono: string;
  comentarioListaEspera: string | null;
  fechaListaEspera: string | null;
  tratamiento: string | null;
  lugarIntervencion: string | null;
}

export function useListaEspera(profesionalId: string | null) {
  return useQuery<PacienteListaEspera[]>({
    queryKey: ["lista-espera", profesionalId],
    queryFn: async () => {
      const { data } = await api.get("/pacientes/lista-espera", {
        params: { profesionalId },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 30_000,
  });
}
