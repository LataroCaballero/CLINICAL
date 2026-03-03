import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ContactoLog {
  id: string;
  tipo: "LLAMADA" | "MENSAJE" | "PRESENCIAL";
  nota?: string;
  fecha: string;
  etapaCRMPost?: string | null;
  temperaturaPost?: string | null;
  proximaAccionFecha?: string | null;
  createdAt: string;
}

export interface ContactosResponse {
  contactos: ContactoLog[];
  diasSinContacto: number;
  total: number;
}

export function useContactos(pacienteId: string, limit?: number) {
  return useQuery<ContactosResponse>({
    queryKey: ["contactos", pacienteId, limit ?? "all"],
    queryFn: async () => {
      const params = limit ? `?limit=${limit}` : "";
      const { data } = await api.get(`/pacientes/${pacienteId}/contactos${params}`);
      return data;
    },
    enabled: !!pacienteId,
    staleTime: 30_000,
  });
}
