'use client';

import { Clock, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useLiveTurnoTimer, formatTimer } from '@/hooks/useLiveTurnoTimer';

export function LiveTurnoRecoveryDialog() {
  const { session, showRecoveryDialog, acknowledgeRecovery, discardRecovery } =
    useLiveTurnoStore();
  const elapsed = useLiveTurnoTimer();

  if (!showRecoveryDialog || !session) return null;

  return (
    <AlertDialog open={showRecoveryDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Sesion activa encontrada
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Se encontro una sesion de LiveTurno que no fue finalizada:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{session.pacienteNombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>
                    Duracion: <span className="font-mono">{formatTimer(elapsed)}</span>
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Tipo: {session.tipoTurno}
                </div>
              </div>
              <p className="text-sm">
                Deseas continuar con esta sesion o descartarla?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={discardRecovery}>
            Descartar sesion
          </AlertDialogCancel>
          <AlertDialogAction onClick={acknowledgeRecovery}>
            Continuar sesion
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
