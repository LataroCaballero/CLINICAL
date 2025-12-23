import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProfessionalContextState {
  selectedProfessionalId: string | null;
  setSelectedProfessionalId: (id: string | null) => void;
}

export const useProfessionalContext = create<ProfessionalContextState>()(
  persist(
    (set) => ({
      selectedProfessionalId: null,
      setSelectedProfessionalId: (id) => set({ selectedProfessionalId: id }),
    }),
    {
      name: "professional-context",
    }
  )
);
