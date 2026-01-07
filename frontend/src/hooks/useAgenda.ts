import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AgendaConfig } from "./useProfesionalMe";

export function useAgenda(profesionalId: string | null) {
  return useQuery<AgendaConfig | null>({
    queryKey: ["agenda", profesionalId],
    queryFn: async () => {
      if (!profesionalId) return null;
      const { data } = await api.get(`/profesionales/${profesionalId}/agenda`);
      return data;
    },
    enabled: !!profesionalId,
  });
}

type UpdateAgendaDto = Partial<AgendaConfig>;

export function useUpdateAgenda() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profesionalId,
      data,
    }: {
      profesionalId: string;
      data: UpdateAgendaDto;
    }) => {
      const res = await api.put(`/profesionales/${profesionalId}/agenda`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["agenda", variables.profesionalId] });
      qc.invalidateQueries({ queryKey: ["profesional"] });
    },
  });
}
