import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoReporteEmail =
  | "RESUMEN_SEMANAL"
  | "RESUMEN_MENSUAL"
  | "INGRESOS"
  | "TURNOS"
  | "MOROSIDAD";

export type FrecuenciaReporte = "SEMANAL" | "MENSUAL";

export interface TipoReporteOption {
  value: TipoReporteEmail;
  label: string;
  descripcion: string;
}

export interface Suscripcion {
  id: string;
  tipoReporte: TipoReporteEmail;
  frecuencia: FrecuenciaReporte;
  emailDestino: string | null;
  activo: boolean;
  ultimoEnvio: string | null;
  proximoEnvio: string | null;
}

export interface CreateSuscripcionDto {
  tipoReporte: TipoReporteEmail;
  frecuencia: FrecuenciaReporte;
  emailDestino?: string;
}

export interface UpdateSuscripcionDto {
  frecuencia?: FrecuenciaReporte;
  emailDestino?: string | null;
  activo?: boolean;
}

// Hook para obtener tipos de reporte disponibles
export function useTiposReporte() {
  return useQuery<TipoReporteOption[]>({
    queryKey: ["reportes", "suscripciones", "tipos"],
    queryFn: async () => {
      const { data } = await api.get("/reportes/suscripciones/tipos");
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
  });
}

// Hook para obtener suscripciones del usuario
export function useSuscripciones() {
  return useQuery<Suscripcion[]>({
    queryKey: ["reportes", "suscripciones"],
    queryFn: async () => {
      const { data } = await api.get("/reportes/suscripciones");
      return data;
    },
  });
}

// Hook para crear suscripción
export function useCreateSuscripcion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateSuscripcionDto) => {
      const { data } = await api.post("/reportes/suscripciones", dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reportes", "suscripciones"] });
    },
  });
}

// Hook para actualizar suscripción
export function useUpdateSuscripcion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateSuscripcionDto;
    }) => {
      const { data } = await api.patch(`/reportes/suscripciones/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reportes", "suscripciones"] });
    },
  });
}

// Hook para toggle de suscripción
export function useToggleSuscripcion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/reportes/suscripciones/${id}/toggle`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reportes", "suscripciones"] });
    },
  });
}

// Hook para eliminar suscripción
export function useDeleteSuscripcion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reportes/suscripciones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reportes", "suscripciones"] });
    },
  });
}

// Hook para enviar reporte de prueba
export function useSendTestReport() {
  return useMutation({
    mutationFn: async ({
      tipoReporte,
      emailDestino,
    }: {
      tipoReporte: TipoReporteEmail;
      emailDestino?: string;
    }) => {
      const { data } = await api.post("/reportes/suscripciones/test", {
        tipoReporte,
        emailDestino,
      });
      return data as { success: boolean };
    },
  });
}
