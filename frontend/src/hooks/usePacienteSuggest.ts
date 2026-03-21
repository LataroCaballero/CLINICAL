import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";

export function usePacienteSuggest(query: string) {
  const debounced = useDebounce(query, 300);
  const profesionalId = useEffectiveProfessionalId();

  return useQuery({
    queryKey: ["pacientes-suggest", debounced, profesionalId],
    queryFn: async () => {
      const res = await api.get("/pacientes/suggest", {
        params: {
          q: debounced,
          ...(profesionalId ? { profesionalId } : {}),
        },
        withCredentials: true,
      });
      return res.data;
    },
    enabled: debounced.length > 0,
  });
}
