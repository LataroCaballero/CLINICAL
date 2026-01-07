import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Profesional = {
  id: string;
  matricula: string | null;
  especialidad: string | null;
  bio: string | null;
  duracionDefault: number | null;
  agenda: AgendaConfig | null;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string | null;
    fotoUrl: string | null;
  };
};

export type AgendaConfig = {
  horariosTrabajo: Record<
    number,
    {
      activo: boolean;
      bloques: Array<{ inicio: string; fin: string }>;
    }
  >;
  diasBloqueados: Array<{
    fecha: string;
    fechaFin?: string;
    motivo: string;
  }>;
  diasCirugia: Array<{
    fecha: string;
    inicio: string;
    fin: string;
  }>;
};

export function useProfesionalMe() {
  return useQuery<Profesional>({
    queryKey: ["profesional", "me"],
    queryFn: async () => {
      const { data } = await api.get("/profesionales/me");
      return data;
    },
  });
}
