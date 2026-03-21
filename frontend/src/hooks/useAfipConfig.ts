import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AfipConfigStatusResponse } from "@/types/afip";

export function useAfipConfig() {
  return useQuery<AfipConfigStatusResponse>({
    queryKey: ["afip-config-status"],
    queryFn: async () => {
      const res = await api.get("/afip-config/status");
      return res.data;
    },
  });
}
