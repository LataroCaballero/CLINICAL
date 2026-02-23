import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WabaConfigResponse {
  phoneNumberId: string;
  displayPhone: string;
  verifiedName?: string;
  activo: boolean;
}

export function useWabaConfig() {
  return useQuery<WabaConfigResponse | null>({
    queryKey: ["waba-config"],
    queryFn: async () => {
      const res = await api.get("/whatsapp/config");
      return res.data;
    },
  });
}
