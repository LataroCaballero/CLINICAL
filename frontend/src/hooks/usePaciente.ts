"use client";

import { useQuery } from "@tanstack/react-query";
import { PacienteDetalle } from "@/types/pacients";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { api } from "@/lib/axios";

export function usePaciente(id: string | null) {
  const effectiveProfessionalId = useEffectiveProfessionalId();

  return useQuery<PacienteDetalle>({
    queryKey: ["paciente", id, effectiveProfessionalId],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/pacientes/${id}`, {
        params: effectiveProfessionalId
          ? { profesionalId: effectiveProfessionalId }
          : {},
      });

      return data;
    },
  });
}
