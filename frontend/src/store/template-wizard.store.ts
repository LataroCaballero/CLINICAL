import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TemplateSchema, TemplateEdge, EdgeCondition } from '@/types/hc-templates';

interface TemplateWizardState {
  // Core state
  entryId: string | null;
  pacienteId: string | null;
  templateSchema: TemplateSchema | null;
  currentNodeId: string | null;
  nodeHistory: string[];
  answers: Record<string, unknown>;
  computed: Record<string, unknown>;

  // UI state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Actions
  initWizard: (params: {
    entryId: string;
    pacienteId: string;
    schema: TemplateSchema;
    initialAnswers?: Record<string, unknown>;
    initialComputed?: Record<string, unknown>;
  }) => void;
  setAnswer: (key: string, value: unknown) => void;
  setComputed: (computed: Record<string, unknown>) => void;
  goToNextNode: () => string | null;
  goBack: () => void;
  goToNode: (nodeId: string) => void;
  markSaving: () => void;
  markSaved: () => void;
  reset: () => void;
}

function evaluateCondition(
  condition: EdgeCondition | undefined,
  answers: Record<string, unknown>
): boolean {
  if (!condition) return true;

  if (condition.eq) {
    const [key, value] = condition.eq;
    return answers[key] === value;
  }

  if (condition.neq) {
    const [key, value] = condition.neq;
    return answers[key] !== value;
  }

  if (condition.and) {
    return condition.and.every((c) => evaluateCondition(c, answers));
  }

  if (condition.or) {
    return condition.or.some((c) => evaluateCondition(c, answers));
  }

  return true;
}

function getNextNodeId(
  currentNodeId: string,
  edges: TemplateEdge[],
  answers: Record<string, unknown>
): string | null {
  const outgoingEdges = edges.filter((e) => e.from === currentNodeId);

  for (const edge of outgoingEdges) {
    if (evaluateCondition(edge.when, answers)) {
      return edge.to;
    }
  }

  return null;
}

const initialState = {
  entryId: null,
  pacienteId: null,
  templateSchema: null,
  currentNodeId: null,
  nodeHistory: [],
  answers: {},
  computed: {},
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
};

export const useTemplateWizardStore = create<TemplateWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initWizard: ({ entryId, pacienteId, schema, initialAnswers, initialComputed }) => {
        set({
          entryId,
          pacienteId,
          templateSchema: schema,
          currentNodeId: schema.startNodeId,
          nodeHistory: [schema.startNodeId],
          answers: initialAnswers || {},
          computed: initialComputed || {},
          isDirty: false,
          isSaving: false,
          lastSavedAt: null,
        });
      },

      setAnswer: (key, value) => {
        set((state) => ({
          answers: { ...state.answers, [key]: value },
          isDirty: true,
        }));
      },

      setComputed: (computed) => {
        set((state) => ({
          computed: { ...state.computed, ...computed },
        }));
      },

      goToNextNode: () => {
        const state = get();
        if (!state.templateSchema || !state.currentNodeId) return null;

        const nextNodeId = getNextNodeId(
          state.currentNodeId,
          state.templateSchema.edges,
          state.answers
        );

        if (nextNodeId) {
          set({
            currentNodeId: nextNodeId,
            nodeHistory: [...state.nodeHistory, nextNodeId],
          });
        }

        return nextNodeId;
      },

      goBack: () => {
        const state = get();
        if (state.nodeHistory.length <= 1) return;

        const newHistory = state.nodeHistory.slice(0, -1);
        set({
          currentNodeId: newHistory[newHistory.length - 1],
          nodeHistory: newHistory,
        });
      },

      goToNode: (nodeId) => {
        const state = get();
        const index = state.nodeHistory.indexOf(nodeId);

        if (index !== -1) {
          // Go back to a previous node
          set({
            currentNodeId: nodeId,
            nodeHistory: state.nodeHistory.slice(0, index + 1),
          });
        }
      },

      markSaving: () => {
        set({ isSaving: true });
      },

      markSaved: () => {
        set({
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date(),
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'template-wizard',
      partialize: (state) => ({
        entryId: state.entryId,
        pacienteId: state.pacienteId,
        templateSchema: state.templateSchema,
        currentNodeId: state.currentNodeId,
        nodeHistory: state.nodeHistory,
        answers: state.answers,
        computed: state.computed,
      }),
    }
  )
);

// Helper hook to get current node
export function useCurrentNode() {
  const { templateSchema, currentNodeId } = useTemplateWizardStore();

  if (!templateSchema || !currentNodeId) return null;

  return templateSchema.nodes.find((n) => n.id === currentNodeId) || null;
}

// Helper to estimate progress
export function useWizardProgress() {
  const { templateSchema, nodeHistory } = useTemplateWizardStore();

  if (!templateSchema) return { current: 0, total: 0, percent: 0 };

  const total = templateSchema.nodes.length;
  const current = nodeHistory.length;
  const percent = Math.round((current / total) * 100);

  return { current, total, percent };
}
