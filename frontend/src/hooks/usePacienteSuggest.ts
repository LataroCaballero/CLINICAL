import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useDebounce } from "@/hooks/useDebounce";

export function usePacienteSuggest(query: string) {
  const debounced = useDebounce(query, 300);

  return useQuery({
    queryKey: ["pacientes-suggest", debounced],
    queryFn: async () => {
      const res = await api.get("/pacientes/suggest", {
        params: { q: debounced },
        withCredentials: true,
      });
      return res.data;
    },
    enabled: debounced.length > 0,
  });
}
