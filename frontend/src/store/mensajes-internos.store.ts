import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MensajesState {
  // Widget UI
  isWidgetOpen: boolean;
  selectedPacienteId: string | null;
  widgetPosition: { x: number; y: number };

  // Contadores (actualizados por polling)
  unreadTotal: number;
  unreadAlta: number;
  unreadByPaciente: Record<string, number>;

  // Actions
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  selectChat: (pacienteId: string) => void;
  clearSelection: () => void;
  setWidgetPosition: (pos: { x: number; y: number }) => void;
  updateUnreadCounts: (data: {
    total: number;
    alta: number;
    porPaciente: Record<string, number>;
  }) => void;
  decrementUnread: (pacienteId: string, count: number) => void;
}

export const useMensajesStore = create<MensajesState>()(
  persist(
    (set) => ({
      // Initial state
      isWidgetOpen: false,
      selectedPacienteId: null,
      widgetPosition: { x: 20, y: 80 },
      unreadTotal: 0,
      unreadAlta: 0,
      unreadByPaciente: {},

      // Actions
      openWidget: () => set({ isWidgetOpen: true }),

      closeWidget: () =>
        set({ isWidgetOpen: false, selectedPacienteId: null }),

      toggleWidget: () =>
        set((state) => ({
          isWidgetOpen: !state.isWidgetOpen,
          selectedPacienteId: state.isWidgetOpen
            ? null
            : state.selectedPacienteId,
        })),

      selectChat: (pacienteId) =>
        set({ selectedPacienteId: pacienteId, isWidgetOpen: true }),

      clearSelection: () => set({ selectedPacienteId: null }),

      setWidgetPosition: (pos) => set({ widgetPosition: pos }),

      updateUnreadCounts: (data) =>
        set({
          unreadTotal: data.total,
          unreadAlta: data.alta,
          unreadByPaciente: data.porPaciente,
        }),

      decrementUnread: (pacienteId, count) =>
        set((state) => {
          const newByPaciente = { ...state.unreadByPaciente };
          const currentCount = newByPaciente[pacienteId] || 0;
          const newCount = Math.max(0, currentCount - count);

          if (newCount === 0) {
            delete newByPaciente[pacienteId];
          } else {
            newByPaciente[pacienteId] = newCount;
          }

          return {
            unreadTotal: Math.max(0, state.unreadTotal - count),
            unreadByPaciente: newByPaciente,
          };
        }),
    }),
    {
      name: 'mensajes-internos',
      partialize: (state) => ({
        widgetPosition: state.widgetPosition,
      }),
    }
  )
);
