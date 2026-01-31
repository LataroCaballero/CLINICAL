'use client';

import { Maximize2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useLiveTurnoTimer, formatTimerCompact } from '@/hooks/useLiveTurnoTimer';

export function LiveTurnoIndicator() {
  const { session, isMinimized, restore } = useLiveTurnoStore();
  const elapsed = useLiveTurnoTimer();

  // Only show when minimized and has active session
  if (!isMinimized || !session) return null;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-4 z-50 animate-in slide-in-from-bottom-2">
      <Button
        onClick={restore}
        className="rounded-full shadow-lg flex items-center gap-3 bg-green-600 hover:bg-green-700 pr-4 h-12"
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2.5 w-2.5 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>

        {/* Patient name (truncated) */}
        <span className="max-w-[120px] truncate text-sm font-medium">
          {session.pacienteNombre}
        </span>

        {/* Timer */}
        <span className="font-mono text-sm bg-green-700 px-2 py-0.5 rounded">
          {formatTimerCompact(elapsed)}
        </span>

        {/* Expand icon */}
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
