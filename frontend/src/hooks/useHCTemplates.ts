import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  HCTemplateWithVersions,
  HCTemplateWithCurrentVersion,
  HCTemplateVersion,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateSchema,
} from '@/types/hc-templates';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// =====================
// QUERIES
// =====================

export function useHCTemplates() {
  return useQuery<HCTemplateWithVersions[]>({
    queryKey: ['hc-templates'],
    queryFn: async () => {
      const { data } = await api.get(`${API_URL}/config/hc-templates`);
      return data;
    },
  });
}

export function useHCTemplate(templateId: string | null) {
  return useQuery<HCTemplateWithVersions>({
    queryKey: ['hc-template', templateId],
    queryFn: async () => {
      const { data } = await api.get(`${API_URL}/config/hc-templates/${templateId}`);
      return data;
    },
    enabled: !!templateId,
  });
}

export function useAvailableHCTemplates() {
  return useQuery<HCTemplateWithCurrentVersion[]>({
    queryKey: ['hc-templates-available'],
    queryFn: async () => {
      const { data } = await api.get(`${API_URL}/hc/templates/available`);
      return data;
    },
  });
}

export function useHCTemplateVersionSchema(templateId: string | null, versionId: string | null) {
  return useQuery<HCTemplateVersion>({
    queryKey: ['hc-template-version', templateId, versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `${API_URL}/hc/templates/${templateId}/version/${versionId}`
      );
      return data;
    },
    enabled: !!templateId && !!versionId,
  });
}

// =====================
// MUTATIONS - Templates
// =====================

export function useCreateHCTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTemplateDto) => {
      const { data } = await api.post(`${API_URL}/config/hc-templates`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hc-templates'] });
    },
  });
}

export function useUpdateHCTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateTemplateDto }) => {
      const { data } = await api.put(`${API_URL}/config/hc-templates/${id}`, dto);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hc-templates'] });
      qc.invalidateQueries({ queryKey: ['hc-template', variables.id] });
    },
  });
}

export function useArchiveHCTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`${API_URL}/config/hc-templates/${id}/archive`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hc-templates'] });
    },
  });
}

// =====================
// MUTATIONS - Versions
// =====================

export function useCreateHCTemplateVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data } = await api.post(
        `${API_URL}/config/hc-templates/${templateId}/versions`
      );
      return data as HCTemplateVersion;
    },
    onSuccess: (_, templateId) => {
      qc.invalidateQueries({ queryKey: ['hc-template', templateId] });
    },
  });
}

export function useUpdateHCTemplateVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      versionId,
      schema,
    }: {
      templateId: string;
      versionId: string;
      schema: TemplateSchema;
    }) => {
      const { data } = await api.put(
        `${API_URL}/config/hc-templates/${templateId}/versions/${versionId}`,
        { schema }
      );
      return data as HCTemplateVersion;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hc-template', variables.templateId] });
      qc.invalidateQueries({
        queryKey: ['hc-template-version', variables.templateId, variables.versionId],
      });
    },
  });
}

export function usePublishHCTemplateVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      versionId,
    }: {
      templateId: string;
      versionId: string;
    }) => {
      const { data } = await api.post(
        `${API_URL}/config/hc-templates/${templateId}/versions/${versionId}/publish`
      );
      return data as HCTemplateVersion;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hc-templates'] });
      qc.invalidateQueries({ queryKey: ['hc-template', variables.templateId] });
      qc.invalidateQueries({ queryKey: ['hc-templates-available'] });
    },
  });
}
