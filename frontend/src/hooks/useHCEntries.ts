import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  HCEntryFromTemplate,
  CreateEntryDto,
  UpdateEntryAnswersDto,
} from '@/types/hc-templates';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// =====================
// QUERIES
// =====================

export function useHCDraftEntries(pacienteId: string | null) {
  return useQuery<HCEntryFromTemplate[]>({
    queryKey: ['hc-entries-drafts', pacienteId],
    queryFn: async () => {
      const { data } = await api.get(
        `${API_URL}/pacientes/${pacienteId}/hc/entries/drafts`
      );
      return data;
    },
    enabled: !!pacienteId,
  });
}

export function useHCEntry(pacienteId: string | null, entryId: string | null) {
  return useQuery<HCEntryFromTemplate>({
    queryKey: ['hc-entry', pacienteId, entryId],
    queryFn: async () => {
      const { data } = await api.get(
        `${API_URL}/pacientes/${pacienteId}/hc/entries/${entryId}`
      );
      return data;
    },
    enabled: !!pacienteId && !!entryId,
  });
}

// =====================
// MUTATIONS
// =====================

export function useCreateHCEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      dto,
    }: {
      pacienteId: string;
      dto: CreateEntryDto;
    }) => {
      const { data } = await api.post(
        `${API_URL}/pacientes/${pacienteId}/hc/entries`,
        dto
      );
      return data as HCEntryFromTemplate;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hc-entries-drafts', variables.pacienteId] });
      qc.invalidateQueries({ queryKey: ['historia-clinica', variables.pacienteId] });
    },
  });
}

export function useUpdateHCEntryAnswers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      entryId,
      dto,
    }: {
      pacienteId: string;
      entryId: string;
      dto: UpdateEntryAnswersDto;
    }) => {
      const { data } = await api.patch(
        `${API_URL}/pacientes/${pacienteId}/hc/entries/${entryId}`,
        dto
      );
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['hc-entry', variables.pacienteId, variables.entryId],
      });
    },
  });
}

export function useFinalizeHCEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      entryId,
    }: {
      pacienteId: string;
      entryId: string;
    }) => {
      const { data } = await api.post(
        `${API_URL}/pacientes/${pacienteId}/hc/entries/${entryId}/finalize`
      );
      return data as HCEntryFromTemplate;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hc-entries-drafts', variables.pacienteId] });
      qc.invalidateQueries({ queryKey: ['historia-clinica', variables.pacienteId] });
      qc.invalidateQueries({
        queryKey: ['hc-entry', variables.pacienteId, variables.entryId],
      });
    },
  });
}

export function useDeleteHCEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      entryId,
    }: {
      pacienteId: string;
      entryId: string;
    }) => {
      await api.delete(
        `${API_URL}/pacientes/${pacienteId}/hc/entries/${entryId}`
      );
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hc-entries-drafts', variables.pacienteId] });
      qc.invalidateQueries({ queryKey: ['historia-clinica', variables.pacienteId] });
    },
  });
}
