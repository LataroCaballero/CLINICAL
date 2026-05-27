"use client";

type FlujoPaciente = 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null;

interface FlujoConfig {
  label: string;
  className: string;
}

const FLUJO_CONFIG: Record<string, FlujoConfig> = {
  CIRUGIA: { label: 'Cirugía', className: 'bg-blue-100 text-blue-700' },
  TRATAMIENTO: { label: 'Tratamiento', className: 'bg-green-100 text-green-700' },
  PENDIENTE: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
};

const FALLBACK_CONFIG: FlujoConfig = {
  label: '—',
  className: 'bg-gray-100 text-gray-500',
};

export function CRMFlujoBadge({ flujo }: { flujo: FlujoPaciente }) {
  const config = flujo ? (FLUJO_CONFIG[flujo] ?? FALLBACK_CONFIG) : FALLBACK_CONFIG;

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
