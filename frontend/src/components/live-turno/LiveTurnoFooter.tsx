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
import { useCreateHistoriaClinicaEntry } from '@/hooks/useCreateHistoriaClinicaEntry';

export function LiveTurnoFooter() {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const { minimize, draftData, session } = useLiveTurnoStore();
  const { cerrarSesion } = useLiveTurnoActions();
  const elapsed = useLiveTurnoTimer();
  const createEntry = useCreateHistoriaClinicaEntry();

  const handleEndSession = async () => {
    try {
      // Auto-guardar HC si hay borrador sin guardar
      const draft = draftData.hcFormDraft;
      if (draft && !draft.saved && session) {
        try {
          if (draft.tipo === 'primera_vez') {
            const hasDiag = (draft.pvDiagnostico?.zonas?.length ?? 0) > 0;
            const hasTrat = (draft.pvTratamientos?.length ?? 0) > 0;
            if (hasDiag || hasTrat) {
              await createEntry.mutateAsync({
                pacienteId: session.pacienteId,
                dto: {
                  tipo: 'primera_vez',
                  diagnostico: draft.pvDiagnostico ?? { zonas: [], subzonas: [] },
                  tratamientos: draft.pvTratamientos ?? [],
                  comentario: draft.pvComentario ?? '',
                  presupuestoId: draft.pvPresupuestoId,
                  presupuestoTotal: draft.pvPresupuestoTotal,
                },
              });
            }
          } else if (draft.textoLibre?.trim()) {
            await createEntry.mutateAsync({
              pacienteId: session.pacienteId,
              dto: { tipo: draft.tipo as any, texto: draft.textoLibre },
            });
          }
        } catch {
          // No bloquear el cierre si falla el auto-guardado
        }
      }

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
