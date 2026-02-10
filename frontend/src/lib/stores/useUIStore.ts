import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  showDock: boolean;
  focusModeEnabled: boolean;

  // Sidebar actions
  expandSidebar: () => void;
  collapseSidebar: () => void;
  toggleSidebar: () => void;

  // Dock actions
  toggleDock: () => void;

  // Focus mode actions
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Estados iniciales
  sidebarCollapsed: false,
  showDock: false,
  focusModeEnabled: false,

  // Acciones Sidebar
  expandSidebar: () => set({ sidebarCollapsed: false }),
  collapseSidebar: () => set({ sidebarCollapsed: true }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Acción Dock
  toggleDock: () =>
    set((state) => ({ showDock: !state.showDock })),

  // Focus mode
  toggleFocusMode: () =>
    set((state) => ({ focusModeEnabled: !state.focusModeEnabled })),
  setFocusMode: (enabled) => set({ focusModeEnabled: enabled }),
}));
