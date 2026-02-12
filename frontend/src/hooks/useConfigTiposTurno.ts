import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ConfigTipoTurnoItem = {
  id?: string;
  tipoTurnoId: string;
  duracionMinutos: number | null;
  colorHex: string | null;
};

export function useConfigTiposTurno(profesionalId: string | null) {
  return useQuery<ConfigTipoTurnoItem[]>({
    queryKey: ["config-tipos-turno", profesionalId],
    queryFn: async () => {
      const { data } = await api.get(
        `/tipos-turno/config/${profesionalId}`
      );
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveConfigTiposTurno(profesionalId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      items: { tipoTurnoId: string; duracionMinutos?: number | null; colorHex?: string | null }[]
    ) => {
      const { data } = await api.put(
        `/tipos-turno/config/${profesionalId}`,
        items
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["config-tipos-turno", profesionalId],
      });
    },
  });
}
