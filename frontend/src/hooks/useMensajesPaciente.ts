import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Mensaje {
  id: string;
  mensaje: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  createdAt: string;
  autorId: string;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
    fotoUrl: string | null;
    rol: string;
  };
  leido: boolean;
  esPropio: boolean;
}

export function useMensajesPaciente(pacienteId: string | null) {
  return useQuery<Mensaje[]>({
    queryKey: ['mensajes-paciente', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return [];
      const { data } = await api.get(`/mensajes-internos/paciente/${pacienteId}`);
      return data;
    },
    enabled: !!pacienteId,
    refetchInterval: 10000, // Polling cada 10 segundos
    staleTime: 3000,
  });
}

export function useCreateMensaje() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      pacienteId: string;
      mensaje: string;
      prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    }) => {
      const response = await api.post('/mensajes-internos', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['mensajes-paciente', variables.pacienteId],
      });
      queryClient.invalidateQueries({ queryKey: ['mensajes-chats'] });
      queryClient.invalidateQueries({ queryKey: ['mensajes-no-leidos'] });
    },
  });
}

export function useMarcarLeido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mensajeId: string) => {
      const response = await api.patch(`/mensajes-internos/${mensajeId}/leer`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes-no-leidos'] });
    },
  });
}

export function useMarcarTodosLeidos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pacienteId: string) => {
      const response = await api.patch(
        `/mensajes-internos/paciente/${pacienteId}/leer-todos`
      );
      return response.data;
    },
    onSuccess: (_, pacienteId) => {
      queryClient.invalidateQueries({
        queryKey: ['mensajes-paciente', pacienteId],
      });
      queryClient.invalidateQueries({ queryKey: ['mensajes-chats'] });
      queryClient.invalidateQueries({ queryKey: ['mensajes-no-leidos'] });
    },
  });
}
