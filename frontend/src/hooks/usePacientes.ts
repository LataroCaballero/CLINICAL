import { useQuery } from "@tanstack/react-query";
import { PacienteListItem } from "@/types/pacients";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { api } from "@/lib/axios";

export function usePacientes() {
  const effectiveProfessionalId = useEffectiveProfessionalId();

  return useQuery<PacienteListItem[], Error>({
    queryKey: ["pacientes", effectiveProfessionalId],
    queryFn: async () => {
      const { data } = await api.get("/pacientes", {
        params: effectiveProfessionalId
          ? { profesionalId: effectiveProfessionalId }
          : {},
      });

      return data;
    },
  });
}
