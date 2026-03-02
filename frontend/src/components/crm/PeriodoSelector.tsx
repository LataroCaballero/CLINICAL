"use client";

import { Periodo } from '@/hooks/usePeriodoFilter';

const OPCIONES: { value: Periodo; label: string }[] = [
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'trimestre', label: 'Este trimestre' },
];

interface Props {
  value: Periodo;
  onChange: (p: Periodo) => void;
}

export function PeriodoSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 text-xs">
      {OPCIONES.map(op => (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          className={`px-2 py-1 rounded transition-colors ${
            value === op.value
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}
