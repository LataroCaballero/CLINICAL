'use client';

import { cn } from '@/lib/utils';

type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

interface PriorityBadgeProps {
  prioridad: Prioridad;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const prioridadConfig: Record<
  Prioridad,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  ALTA: {
    label: 'Alta',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
  MEDIA: {
    label: 'Media',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    dotColor: 'bg-yellow-500',
  },
  BAJA: {
    label: 'Baja',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    dotColor: 'bg-blue-500',
  },
};

export function PriorityBadge({
  prioridad,
  size = 'sm',
  showLabel = true,
}: PriorityBadgeProps) {
  const config = prioridadConfig[prioridad];

  if (!showLabel) {
    return (
      <span
        className={cn(
          'inline-block rounded-full',
          config.dotColor,
          size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
        )}
        title={config.label}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      <span
        className={cn(
          'rounded-full',
          config.dotColor,
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
      />
      {config.label}
    </span>
  );
}
