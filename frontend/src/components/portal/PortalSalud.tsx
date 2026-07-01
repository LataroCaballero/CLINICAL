"use client";

import type { PortalDatos } from "@/types/portal";

interface Props {
  salud: PortalDatos["saludAutoReportada"];
}

/**
 * Seccion "Salud" del portal del paciente.
 * Wave 2 (Plan 03) implementa chips seleccionables y campo "otro".
 * Contrato de props: salud: PortalDatos["saludAutoReportada"]
 */
export function PortalSalud({ salud: _salud }: Props) {
  return (
    <div className="space-y-4 text-base">
      <p className="text-gray-500">Cargando tu informacion de salud...</p>
    </div>
  );
}
