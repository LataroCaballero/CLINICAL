import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SaveCertRequest, AfipConfigStatusResponse } from "@/types/afip";

export function useSaveCert() {
  const queryClient = useQueryClient();
  return useMutation<AfipConfigStatusResponse, Error, SaveCertRequest>({
    mutationFn: async (data) => {
      const res = await api.post("/afip-config/cert", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["afip-config-status"] });
    },
  });
}
