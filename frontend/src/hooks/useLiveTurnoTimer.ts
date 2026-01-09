import { useState, useEffect, useCallback } from 'react';
import { useLiveTurnoStore } from '@/store/live-turno.store';

export function useLiveTurnoTimer() {
  const session = useLiveTurnoStore((state) => state.session);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed time
    const startTime = new Date(session.startedAt).getTime();
    const calculateElapsed = () =>
      Math.floor((Date.now() - startTime) / 1000);

    setElapsed(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  return elapsed;
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatTimerCompact(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Hook that returns formatted time string
export function useFormattedTimer() {
  const elapsed = useLiveTurnoTimer();
  return formatTimer(elapsed);
}
