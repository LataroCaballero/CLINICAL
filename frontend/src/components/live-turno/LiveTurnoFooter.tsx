'use client';

import { useState } from 'react';
import { Minimize2, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useLiveTurnoActions } from '@/hooks/useLiveTurnoActions';
import { useLiveTurnoTimer, formatTimer } from '@/hooks/useLiveTurnoTimer';

export function LiveTurnoFooter() {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const { minimize, draftData } = useLiveTurnoStore();
  const { cerrarSesion } = useLiveTurnoActions();
  const elapsed = useLiveTurnoTimer();

  const handleEndSession = async () => {
    try {
      await cerrarSesion.mutateAsync({
        entradaHCId: draftData.hcEntryId,
      });
      setShowEndDialog(false);
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
        <div className="text-sm text-gray-500">
          Duracion: <span className="font-mono">{formatTimer(elapsed)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={minimize}>
            <Minimize2 className="w-4 h-4 mr-2" />
            Minimizar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowEndDialog(true)}
            disabled={cerrarSesion.isPending}
          >
            {cerrarSesion.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Square className="w-4 h-4 mr-2" />
            )}
            Finalizar sesion
          </Button>
        </div>
      </div>

      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar sesion</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro que deseas finalizar la sesion? El turno se marcara
              como completado y se registrara la duracion de{' '}
              <span className="font-mono font-semibold">
                {formatTimer(elapsed)}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cerrarSesion.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
