import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffectiveProfessionalId } from './useEffectiveProfessionalId';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { toast } from 'sonner';

interface ContadoresNoLeidos {
  total: number;
  alta: number;
  porPaciente: Record<string, number>;
}

export function useMensajesNotifications() {
  const professionalId = useEffectiveProfessionalId();
  const updateUnreadCounts = useMensajesStore((s) => s.updateUnreadCounts);
  const openWidget = useMensajesStore((s) => s.openWidget);
  const prevAltaRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const query = useQuery<ContadoresNoLeidos>({
    queryKey: ['mensajes-no-leidos', professionalId],
    queryFn: async () => {
      const { data } = await api.get('/mensajes-internos/no-leidos', {
        params: professionalId ? { profesionalId: professionalId } : {},
      });
      return data;
    },
    refetchInterval: 60_000, // Polling cada 60 segundos
  });

  // Sincronizar con el store de Zustand
  useEffect(() => {
    if (query.data) {
      updateUnreadCounts(query.data);
    }
  }, [query.data, updateUnreadCounts]);

  // Detectar nuevos mensajes ALTA y notificar
  useEffect(() => {
    if (query.data === undefined) return;

    const currentAlta = query.data.alta;

    // Si es la primera carga, solo guardar el valor
    if (prevAltaRef.current === null) {
      prevAltaRef.current = currentAlta;
      return;
    }

    // Si hay nuevos mensajes ALTA
    if (currentAlta > prevAltaRef.current) {
      // Reproducir sonido
      playNotificationSound();

      // Mostrar toast persistente
      toast.error('Mensaje urgente', {
        description: 'Nuevo mensaje de prioridad ALTA',
        duration: 10000,
        action: {
          label: 'Ver',
          onClick: () => openWidget(),
        },
      });
    }

    prevAltaRef.current = currentAlta;
  }, [query.data, openWidget]);

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/notification.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorar errores de autoplay (requiere interacción del usuario)
      });
    } catch {
      // Ignorar errores de audio
    }
  };

  return query;
}
