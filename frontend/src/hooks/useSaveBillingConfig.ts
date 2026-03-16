import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SaveBillingConfigRequest, AfipConfigStatusResponse } from "@/types/afip";

export function useSaveBillingConfig() {
  const queryClient = useQueryClient();
  return useMutation<AfipConfigStatusResponse, Error, SaveBillingConfigRequest>({
    mutationFn: async (data) => {
      const res = await api.patch("/afip-config/billing", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["afip-config-status"] });
    },
  });
}
