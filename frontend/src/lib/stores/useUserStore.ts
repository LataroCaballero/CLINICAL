import { create } from "zustand";

export type UserRole = "ADMINISTRADOR" | "PROFESIONAL" | "SECRETARIA" | "PACIENTE";

interface UserState {
  name: string;
  role: UserRole;
  setUser: (name: string, role: UserRole) => void;
  resetUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: "Federico García",
  role: "PROFESIONAL",
  setUser: (name, role) => set({ name, role }),
  resetUser: () => set({ name: "", role: "PACIENTE" }),
}));
