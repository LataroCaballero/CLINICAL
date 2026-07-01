import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portalApi } from "@/lib/portal-api";
import type { PortalDatos, UpdateContactoPayload, UpdateSaludPayload } from "@/types/portal";

export function usePortalDatos(enabled: boolean) {
  return useQuery<PortalDatos>({
    queryKey: ["portal-datos"],
    queryFn: async () => {
      const { data } = await portalApi.get("/paciente-portal/public");
      return data;
    },
    enabled,
  });
}

export function useUpdateContacto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateContactoPayload) => {
      const { data } = await portalApi.patch(
        "/paciente-portal/public/datos-personales",
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-datos"] });
    },
  });
}

export function useUpdateSalud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateSaludPayload) => {
      const { data } = await portalApi.patch(
        "/paciente-portal/public/salud",
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-datos"] });
    },
  });
}

export function useEnviarConsulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mensaje: string) => {
      const { data } = await portalApi.post(
        "/paciente-portal/public/consulta",
        { mensaje }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-datos"] });
    },
  });
}
