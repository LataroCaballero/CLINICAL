'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query: unread WA count per patient — polled every 30s for near-real-time feedback
// Returns {pacienteId: unreadCount} map — only patients with unread > 0 are included
export function useWAUnread() {
  return useQuery<Record<string, number>>({
    queryKey: ['wa-unread'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/unread');
      return res.data ?? {};
    },
    refetchInterval: 30 * 1000, // 30s polling — no WebSocket this phase
    staleTime: 10 * 1000,
  });
}

// Types matching MensajeWhatsApp Prisma model fields + DireccionMensajeWA
export type EstadoMensajeWA = 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO' | 'LEIDO' | 'FALLIDO';
export type DireccionMensajeWA = 'OUTBOUND' | 'INBOUND';
export type TipoMensajeWA = 'PRESUPUESTO' | 'RECORDATORIO_TURNO' | 'SEGUIMIENTO' | 'CUSTOM';

export interface WAMessage {
  id: string;
  waMessageId: string | null;
  pacienteId: string;
  tipo: TipoMensajeWA;
  contenido: string | null;
  estado: EstadoMensajeWA;
  direccion: DireccionMensajeWA;
  errorMsg: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface WATemplate {
  name: string;
  language: string;
  status: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    parameters?: object[];
  }>;
}

// Query: fetch message thread for patient
export function useWAThread(pacienteId: string) {
  return useQuery<WAMessage[]>({
    queryKey: ['wa-thread', pacienteId],
    queryFn: async () => {
      const res = await api.get(`/whatsapp/mensajes/${pacienteId}`);
      return res.data;
    },
    enabled: !!pacienteId,
  });
}

// Query: fetch approved templates from Meta
export function useWATemplates() {
  return useQuery<WATemplate[]>({
    queryKey: ['wa-templates'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/templates');
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // templates don't change often — 5min cache
  });
}

// Mutation: send template message
export function useSendWATemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      pacienteId: string;
      templateName: string;
      tipo: TipoMensajeWA;
      languageCode?: string;
      components?: object[];
    }) => {
      const res = await api.post('/whatsapp/mensajes', data);
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['wa-thread', vars.pacienteId] });
    },
  });
}

// Mutation: send free-text reply (within 24h window)
export function useSendWAFreeText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { pacienteId: string; texto: string }) => {
      const res = await api.post('/whatsapp/mensajes/free-text', data);
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['wa-thread', vars.pacienteId] });
    },
  });
}

// Mutation: retry failed message (re-enqueue the same mensajeId)
export function useRetryWAMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { mensajeId: string; pacienteId: string }) => {
      const res = await api.post(`/whatsapp/mensajes/${data.mensajeId}/retry`);
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['wa-thread', vars.pacienteId] });
    },
  });
}
