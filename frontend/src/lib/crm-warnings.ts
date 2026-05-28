import { KanbanPatient, EtapaCRM } from "@/hooks/useCRMKanban";

export function getEtapaWarning(
  patient: KanbanPatient,
  targetEtapa: EtapaCRM
): string | null {
  if (targetEtapa === "PRESUPUESTO_ENVIADO" && patient.presupuesto === null) {
    return "No hay presupuesto enviado a este paciente";
  }
  if (targetEtapa === "CONFIRMADO" && patient.presupuesto?.estado !== "ACEPTADO") {
    return "Ningún presupuesto fue aceptado — verificá antes de confirmar";
  }
  return null;
}
