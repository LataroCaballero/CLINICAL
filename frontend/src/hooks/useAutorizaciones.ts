import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CodigoPractica {
  codigo: string;
  descripcion: string;
  monto?: number;
  coseguro?: number;
}

export interface AutorizacionObraSocial {
  id: string;
  pacienteId: string;
  obraSocialId: string;
  profesionalId: string;
  codigos: CodigoPractica[];
  estado: "PENDIENTE" | "AUTORIZADO" | "RECHAZADO";
  notaSecretaria?: string | null;
  fechaAutorizacion?: string | null;
  createdAt: string;
  paciente: { id: string; nombreCompleto: string; telefono: string };
  obraSocial: { id: string; nombre: string };
  profesional: { id: string; usuario: { nombre: string; apellido: string } };
}

export function useAutorizacionesPendientes(profesionalId?: string | null) {
  return useQuery<AutorizacionObraSocial[]>({
    queryKey: ["autorizaciones", "PENDIENTE", profesionalId ?? null],
    queryFn: async () => {
      const { data } = await api.get("/autorizaciones", {
        params: {
          estado: "PENDIENTE",
          ...(profesionalId ? { profesionalId } : {}),
        },
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAutorizacionesByPaciente(pacienteId: string | null) {
  return useQuery<AutorizacionObraSocial[]>({
    queryKey: ["autorizaciones", "paciente", pacienteId],
    queryFn: async () => {
      const { data } = await api.get("/autorizaciones", {
        params: { pacienteId },
      });
      return data;
    },
    enabled: !!pacienteId,
    staleTime: 30_000,
  });
}

export function useCreateAutorizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      pacienteId: string;
      obraSocialId: string;
      codigos: CodigoPractica[];
      profesionalId?: string;
    }) => {
      const { data } = await api.post("/autorizaciones", dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autorizaciones"] });
      qc.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}

export function useAutorizarCodigos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      notaSecretaria,
    }: {
      id: string;
      notaSecretaria?: string;
    }) => {
      const { data } = await api.patch(`/autorizaciones/${id}/autorizar`, {
        notaSecretaria,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autorizaciones"] });
      qc.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}

export function useRechazarAutorizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nota }: { id: string; nota?: string }) => {
      const { data } = await api.patch(`/autorizaciones/${id}/rechazar`, {
        nota,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autorizaciones"] });
      qc.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}
