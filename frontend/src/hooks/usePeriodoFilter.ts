import { useState, useEffect } from 'react';

export type Periodo = 'semana' | 'mes' | 'trimestre';

export function usePeriodoFilter(storageKey: string, defaultPeriodo: Periodo = 'mes') {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    if (typeof window === 'undefined') return defaultPeriodo;
    const stored = localStorage.getItem(storageKey);
    return (stored === 'semana' || stored === 'mes' || stored === 'trimestre')
      ? stored
      : defaultPeriodo;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, periodo);
  }, [storageKey, periodo]);

  return [periodo, setPeriodo] as const;
}
