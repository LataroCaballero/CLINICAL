import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EtapaCRM, KanbanColumn, KanbanPatient, MotivoPerdidaCRM } from "./useCRMKanban";

interface UpdateEtapaCRMPayload {
  pacienteId: string;
  etapaCRM: EtapaCRM;
  motivoPerdida?: MotivoPerdidaCRM;
}

export function useUpdateEtapaCRM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pacienteId, etapaCRM, motivoPerdida }: UpdateEtapaCRMPayload) => {
      const { data } = await api.patch(`/pacientes/${pacienteId}/etapa-crm`, {
        etapaCRM,
        motivoPerdida,
      });
      return data;
    },
    onMutate: async ({ pacienteId, etapaCRM }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["crm-kanban"] });

      // Snapshot for rollback on error
      const previousData = queryClient.getQueriesData<KanbanColumn[]>({ queryKey: ["crm-kanban"] });

      // Apply move to cache immediately — eliminates the flash between clearing
      // pendingMoves and the refetch completing
      queryClient.setQueriesData<KanbanColumn[]>(
        { queryKey: ["crm-kanban"] },
        (old) => {
          if (!old) return old;

          let movedPatient: KanbanPatient | undefined;
          for (const col of old) {
            movedPatient = col.pacientes.find((p) => p.id === pacienteId);
            if (movedPatient) break;
          }
          if (!movedPatient) return old;

          const updatedPatient: KanbanPatient = { ...movedPatient, etapaCRM };

          return old.map((col) => {
            if (col.etapa === etapaCRM) {
              const exists = col.pacientes.some((p) => p.id === pacienteId);
              return {
                ...col,
                pacientes: exists
                  ? col.pacientes.map((p) => (p.id === pacienteId ? updatedPatient : p))
                  : [updatedPatient, ...col.pacientes],
                total: exists ? col.total : col.total + 1,
              };
            }
            const had = col.pacientes.some((p) => p.id === pacienteId);
            return had
              ? {
                  ...col,
                  pacientes: col.pacientes.filter((p) => p.id !== pacienteId),
                  total: col.total - 1,
                }
              : col;
          });
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Roll back cache to pre-mutation state
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      // Sync with server after mutation resolves (success or error)
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
