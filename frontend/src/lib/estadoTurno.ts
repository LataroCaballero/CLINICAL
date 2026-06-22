/**
 * Helper puro: mapea un valor de EstadoTurno a { label, className }.
 * Cubre los 7 valores reales del enum + fallback neutro.
 * Sin imports de React ni NestJS — módulo TypeScript puro.
 */
export function getEstadoTurnoChip(estado: string): { label: string; className: string } {
  switch (estado) {
    case "CONFIRMADO":
      return { label: "Confirmado", className: "bg-green-100 text-green-700" };
    case "PENDIENTE":
      return { label: "Pendiente", className: "bg-yellow-100 text-yellow-700" };
    case "FINALIZADO":
      return { label: "Finalizado", className: "bg-blue-100 text-blue-700" };
    case "AUSENTE":
      return { label: "Ausente", className: "bg-gray-100 text-gray-700" };
    case "CANCELADO":
      return { label: "Cancelado", className: "bg-red-100 text-red-700" };
    case "EN_ESPERA":
      // Alineado con dot violeta #A78BFA del calendario (CalendarGrid)
      return { label: "En espera", className: "bg-violet-100 text-violet-700" };
    case "SIENDO_ATENDIDO":
      // Alineado con dot sky #0EA5E9 del calendario (CalendarGrid)
      return { label: "Atendiendo", className: "bg-sky-100 text-sky-700" };
    default:
      // Fallback neutro: muestra el valor crudo sin romper
      return { label: estado, className: "bg-gray-100 text-gray-500" };
  }
}
