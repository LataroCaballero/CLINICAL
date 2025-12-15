"use client";

import { PacienteDetalle } from "@/types/pacients";
import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function usePaciente(id: string | null) {
  return useQuery<PacienteDetalle>({
    queryKey: ["paciente", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/pacientes/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error obteniendo paciente");
      return res.json();
    },
  });
}
