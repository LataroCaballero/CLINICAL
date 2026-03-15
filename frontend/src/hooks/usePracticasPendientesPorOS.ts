import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PracticaPendientePorOS {
  id: string;
  codigo: string;
  descripcion: string;
  monto: number;
  coseguro: number;
  montoPagado: number | null;
  fecha: string; // ISO string from JSON serialization
  paciente: { id: string; nombreCompleto: string; dni: string } | null;
}

export function usePracticasPendientesPorOS(
  profesionalId: string | null,
  obraSocialId: string | null,
) {
  return useQuery({
    queryKey: ['finanzas', 'practicas-pendientes-por-os', profesionalId, obraSocialId],
    queryFn: async () => {
      const { data } = await api.get(
        `/finanzas/practicas-pendientes/${profesionalId}/por-os/${obraSocialId}`,
      );
      return data as PracticaPendientePorOS[];
    },
    enabled: !!profesionalId && !!obraSocialId,
    staleTime: 30_000,
  });
}
