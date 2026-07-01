"use client";

import type { PortalDatos } from "@/types/portal";

interface Props {
  datos: PortalDatos;
}

/**
 * Seccion "Info basica" del portal del paciente.
 * Wave 2 (Plan 03) implementa el formulario completo.
 * Contrato de props: datos: PortalDatos
 */
export function PortalInfoBasica({ datos: _datos }: Props) {
  return (
    <div className="space-y-4 text-base">
      <p className="text-gray-500">Cargando tus datos de contacto...</p>
    </div>
  );
}
