'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useSesionActiva, useLiveTurnoActions } from '@/hooks/useLiveTurnoActions';
import { useEffectiveProfessionalId } from '@/hooks/useEffectiveProfessionalId';

interface SesionActivaResponse {
  id: string;
  inicioReal: string;
  paciente: {
    id: string;
    nombreCompleto: string;
  };
  tipoTurno: {
    nombre: string;
  };
}

export function LiveTurnoSyncChecker() {
  const profesionalId = useEffectiveProfessionalId();
  const { session, startSession } = useLiveTurnoStore();
  const { data: sesionActiva, isLoading } = useSesionActiva(profesionalId);
  const { cerrarSesionPorId } = useLiveTurnoActions();
  const [showDialog, setShowDialog] = useState(false);

  // Detectar sesión huérfana: existe en backend pero no en store local
  const sesionHuerfana = sesionActiva && !session ? (sesionActiva as SesionActivaResponse) : null;

  useEffect(() => {
    if (sesionHuerfana) {
      setShowDialog(true);
    }
  }, [sesionHuerfana]);

  if (isLoading || !sesionHuerfana || !showDialog) return null;

  const handleRecuperar = () => {
    // Restaurar la sesión en el store local
    startSession({
      turnoId: sesionHuerfana.id,
      pacienteId: sesionHuerfana.paciente.id,
      pacienteNombre: sesionHuerfana.paciente.nombreCompleto,
      profesionalId: profesionalId!,
      tipoTurno: sesionHuerfana.tipoTurno.nombre,
      tipoTurnoId: '', // No lo tenemos, pero no es crítico
      startedAt: sesionHuerfana.inicioReal,
      scheduledStart: sesionHuerfana.inicioReal,
    });
    setShowDialog(false);
  };

  const handleCerrar = () => {
    cerrarSesionPorId.mutate(sesionHuerfana.id, {
      onSuccess: () => setShowDialog(false),
    });
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Sesion activa en el servidor
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Hay una sesion activa en el servidor que no esta sincronizada con este navegador:
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <div className="font-medium text-orange-800">
                  {sesionHuerfana.paciente.nombreCompleto}
                </div>
                <div className="text-sm text-orange-700">
                  Tipo: {sesionHuerfana.tipoTurno.nombre}
                </div>
                <div className="text-sm text-orange-600">
                  Iniciada: {new Date(sesionHuerfana.inicioReal).toLocaleString('es-AR')}
                </div>
              </div>
              <p className="text-sm">
                Puedes recuperar esta sesion para continuar trabajando, o cerrarla si ya no es necesaria.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCerrar}
            disabled={cerrarSesionPorId.isPending}
          >
            {cerrarSesionPorId.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            Cerrar sesion
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleRecuperar}>
            Recuperar sesion
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
