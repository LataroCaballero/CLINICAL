import { useQuery } from "@tanstack/react-query";
import { fetchPacientes } from "@/lib/api/pacientes";
import { PacienteListItem } from "@/types/pacients";

export function usePacientes() {
  return useQuery<PacienteListItem[], Error>({
    queryKey: ["pacientes"],
    queryFn: fetchPacientes,
  });
}
