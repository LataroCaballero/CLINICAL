import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffectiveProfessionalId } from './useEffectiveProfessionalId';

export interface ChatItem {
  id: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  ultimoMensaje: {
    id: string;
    mensaje: string;
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    createdAt: string;
    autor: {
      id: string;
      nombre: string;
      apellido: string;
    };
  } | null;
  unreadCount: number;
  unreadAlta: number;
}

export function useMensajesChats() {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<ChatItem[]>({
    queryKey: ['mensajes-chats', professionalId],
    queryFn: async () => {
      const { data } = await api.get('/mensajes-internos/chats', {
        params: professionalId ? { profesionalId: professionalId } : {},
      });
      return data;
    },
    refetchInterval: 15000, // Polling cada 15 segundos
    staleTime: 5000,
  });
}
