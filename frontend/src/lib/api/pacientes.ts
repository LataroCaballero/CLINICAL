import { PacienteListItem } from "@/types/pacients";

export async function fetchPacientes(): Promise<PacienteListItem[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pacientes`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error al cargar pacientes");
  }

  return res.json();
}
