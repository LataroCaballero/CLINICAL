import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type UpdateProfesionalDto = {
  matricula?: string;
  especialidad?: string;
  bio?: string;
  duracionDefault?: number;
};

export function useUpdateProfesional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProfesionalDto;
    }) => {
      const res = await api.patch(`/profesionales/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profesional"] });
    },
  });
}
