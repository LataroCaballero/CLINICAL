// src/lib/stores/useUIStore.ts
import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  expandSidebar: () => set({ sidebarCollapsed: false }),
  collapseSidebar: () => set({ sidebarCollapsed: true }),
}));
