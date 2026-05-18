import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export type TurnoEstado =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'CANCELADO'
  | 'AUSENTE'
  | 'FINALIZADO'
  | 'EN_ESPERA'
  | 'SIENDO_ATENDIDO';

export function useTurnoEstadoActions() {
  const qc = useQueryClient();

  const marcarEnEspera = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.patch(`/turnos/${turnoId}/marcar-en-espera`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] });
      qc.invalidateQueries({ queryKey: ['alertas-resumen'] });
      toast.success('Paciente en espera');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Error';
      toast.error(message);
    },
  });

  const marcarAusente = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.patch(`/turnos/${turnoId}/marcar-ausente`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] });
      qc.invalidateQueries({ queryKey: ['alertas-resumen'] });
      toast.success('Paciente marcado como ausente');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Error';
      toast.error(message);
    },
  });

  const reactivar = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.patch(`/turnos/${turnoId}/reactivar`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] });
      qc.invalidateQueries({ queryKey: ['alertas-resumen'] });
      toast.success('Turno reactivado');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Error';
      toast.error(message);
    },
  });

  return { marcarEnEspera, marcarAusente, reactivar };
}
