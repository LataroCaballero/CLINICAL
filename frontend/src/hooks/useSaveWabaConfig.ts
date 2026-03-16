import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SaveWabaConfigInput {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string;
}

export function useSaveWabaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveWabaConfigInput) => {
      const res = await api.post("/whatsapp/config", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waba-config"] });
    },
  });
}
