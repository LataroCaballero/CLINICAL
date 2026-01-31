import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LiveTurnoSession {
  turnoId: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono?: string;
  pacienteEmail?: string;
  pacienteObraSocial?: string;
  pacientePlan?: string;
  profesionalId: string;
  tipoTurno: string;
  tipoTurnoId: string;
  startedAt: string; // ISO string
  scheduledStart: string; // Original turno.inicio
}

export interface LiveTurnoDraftData {
  hcEntryId?: string;
  hcDraftAnswers?: Record<string, unknown>;
  scheduledTurnoData?: {
    fecha?: string;
    hora?: string;
    tipoTurnoId?: string;
    observaciones?: string;
  };
  pagoData?: {
    monto?: number;
    descripcion?: string;
    completed?: boolean;
  };
}

export type LiveTurnoTab = 'hc' | 'datos' | 'turno' | 'cobro';

interface LiveTurnoState {
  // Session state
  session: LiveTurnoSession | null;
  draftData: LiveTurnoDraftData;

  // UI state
  isMinimized: boolean;
  isPanelOpen: boolean;
  activeTab: LiveTurnoTab;

  // Recovery state
  showRecoveryDialog: boolean;
  _hasHydrated: boolean;

  // Actions
  startSession: (session: LiveTurnoSession) => void;
  endSession: () => void;

  // Draft management
  setDraftData: <K extends keyof LiveTurnoDraftData>(
    key: K,
    value: LiveTurnoDraftData[K]
  ) => void;
  clearDraftData: () => void;

  // UI actions
  minimize: () => void;
  restore: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setActiveTab: (tab: LiveTurnoTab) => void;

  // Recovery
  acknowledgeRecovery: () => void;
  discardRecovery: () => void;

  // Timer helper
  getElapsedSeconds: () => number;
}

const initialState = {
  session: null as LiveTurnoSession | null,
  draftData: {} as LiveTurnoDraftData,
  isMinimized: false,
  isPanelOpen: false,
  activeTab: 'hc' as LiveTurnoTab,
  showRecoveryDialog: false,
  _hasHydrated: false,
};

export const useLiveTurnoStore = create<LiveTurnoState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startSession: (session) => {
        set({
          session,
          isPanelOpen: true,
          isMinimized: false,
          activeTab: 'hc',
          draftData: {},
          showRecoveryDialog: false,
        });
      },

      endSession: () => {
        set({
          session: null,
          draftData: {},
          isPanelOpen: false,
          isMinimized: false,
          showRecoveryDialog: false,
        });
      },

      setDraftData: (key, value) => {
        set((state) => ({
          draftData: { ...state.draftData, [key]: value },
        }));
      },

      clearDraftData: () => {
        set({ draftData: {} });
      },

      minimize: () => {
        set({ isMinimized: true, isPanelOpen: false });
      },

      restore: () => {
        set({ isMinimized: false, isPanelOpen: true });
      },

      openPanel: () => {
        set({ isPanelOpen: true, isMinimized: false });
      },

      closePanel: () => {
        set({ isPanelOpen: false });
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      acknowledgeRecovery: () => {
        set({ showRecoveryDialog: false, isPanelOpen: true });
      },

      discardRecovery: () => {
        set({
          session: null,
          draftData: {},
          isPanelOpen: false,
          isMinimized: false,
          showRecoveryDialog: false,
        });
      },

      getElapsedSeconds: () => {
        const { session } = get();
        if (!session) return 0;
        return Math.floor(
          (Date.now() - new Date(session.startedAt).getTime()) / 1000
        );
      },
    }),
    {
      name: 'live-turno-session',
      partialize: (state) => ({
        session: state.session,
        draftData: state.draftData,
        isMinimized: state.isMinimized,
        activeTab: state.activeTab,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
          // If we have a session on rehydration, show recovery dialog
          if (state.session) {
            state.showRecoveryDialog = true;
          }
        }
      },
    }
  )
);

// Helper hook to check if there's an active session
export function useHasActiveSession() {
  const session = useLiveTurnoStore((state) => state.session);
  return session !== null;
}

// Helper hook to get session duration formatted
export function useSessionDuration() {
  const getElapsedSeconds = useLiveTurnoStore((state) => state.getElapsedSeconds);
  return getElapsedSeconds();
}
