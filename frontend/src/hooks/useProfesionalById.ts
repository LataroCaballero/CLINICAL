import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profesional } from '@/hooks/useProfesionalMe';

export function useProfesionalById(id: string | null) {
  return useQuery<Profesional>({
    queryKey: ['profesional', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/profesionales/${id}`);
      return data;
    },
  });
}
