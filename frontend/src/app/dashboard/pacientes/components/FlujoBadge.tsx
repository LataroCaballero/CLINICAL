"use client";

type FlujoPaciente = 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null;

const FLUJO_CONFIG: Record<string, { label: string; className: string }> = {
  CIRUGIA:     { label: 'CIR',  className: 'bg-blue-100 text-blue-700' },
  TRATAMIENTO: { label: 'TRAT', className: 'bg-green-100 text-green-700' },
  PENDIENTE:   { label: 'PEND', className: 'bg-amber-100 text-amber-700' },
};

export function FlujoBadge({ flujo }: { flujo: FlujoPaciente }) {
  const config = flujo ? FLUJO_CONFIG[flujo] : null;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        config ? config.className : 'bg-gray-100 text-gray-500'
      }`}
    >
      {config ? config.label : '—'}
    </span>
  );
}
