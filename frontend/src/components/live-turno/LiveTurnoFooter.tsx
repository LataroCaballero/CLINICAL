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
import { useCreateHistoriaClinicaEntry } from '@/hooks/useCreateHistoriaClinicaEntry';

export function LiveTurnoFooter() {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showCloseNoHcDialog, setShowCloseNoHcDialog] = useState(false);
  const { minimize, draftData, session } = useLiveTurnoStore();
  const { cerrarSesion } = useLiveTurnoActions();
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
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
        <Button variant="outline" onClick={minimize}>
          <Minimize2 className="w-4 h-4 mr-2" />
          Minimizar
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowCloseNoHcDialog(true)}
          disabled={cerrarSesion.isPending}
        >
          Cerrar sin guardar entrada de HC
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

      {/* Dialog: Finalizar sesion con auto-guardado HC */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar sesion</AlertDialogTitle>
            <AlertDialogDescription>
              La sesión será finalizada y el turno quedará marcado como completado.
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

      {/* Dialog: Cerrar sin registrar HC */}
      <AlertDialog open={showCloseNoHcDialog} onOpenChange={setShowCloseNoHcDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar sin registrar HC</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cerrar la sesión sin registrar entrada de HC? El turno quedará finalizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await cerrarSesion.mutateAsync({});
                  setShowCloseNoHcDialog(false);
                } catch {
                  // toast de error ya manejado por el mutation onError
                }
              }}
            >
              {cerrarSesion.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
