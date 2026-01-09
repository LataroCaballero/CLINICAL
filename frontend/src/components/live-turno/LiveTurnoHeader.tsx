'use client';

import { User, Clock, Phone, Mail, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useLiveTurnoTimer, formatTimer } from '@/hooks/useLiveTurnoTimer';

export function LiveTurnoHeader() {
  const session = useLiveTurnoStore((state) => state.session);
  const elapsed = useLiveTurnoTimer();

  if (!session) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
      {/* Patient Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {session.pacienteNombre}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Badge variant="outline">{session.tipoTurno}</Badge>
            </span>
            {session.pacienteTelefono && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {session.pacienteTelefono}
              </span>
            )}
            {session.pacienteObraSocial && (
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {session.pacienteObraSocial}
                {session.pacientePlan && ` - ${session.pacientePlan}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Session Status & Timer */}
      <div className="flex items-center gap-6">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-700">En curso</span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <Clock className="w-5 h-5 text-gray-600" />
          <span className="font-mono text-xl font-semibold text-gray-900">
            {formatTimer(elapsed)}
          </span>
        </div>
      </div>
    </div>
  );
}
