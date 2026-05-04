'use client';

import { useRef, useState, useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { Button } from '@/components/ui/button';

type BannerPhase = 'visible' | 'classified' | 'gone';

export function LiveTurnoFlujoBanner() {
  const [phase, setPhase] = useState<BannerPhase>('visible');
  const [classifiedAs, setClassifiedAs] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useLiveTurnoStore((s) => s.session);
  const bannerDismissed = useLiveTurnoStore((s) => s.bannerDismissed);
  const dismissBanner = useLiveTurnoStore((s) => s.dismissBanner);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!session || session.pacienteFlujo !== 'PENDIENTE') return null;
  if (bannerDismissed || phase === 'gone') return null;

  function handleClassify(flujo: 'CIRUGIA' | 'TRATAMIENTO') {
    const label = flujo === 'CIRUGIA' ? 'Cirugía' : 'Tratamiento';
    setClassifiedAs(label);
    setPhase('classified');

    api
      .patch(`/pacientes/${session!.pacienteId}/flujo`, { flujo })
      .catch(() => {});

    timerRef.current = setTimeout(() => {
      dismissBanner();
      setPhase('gone');
    }, 2000);
  }

  function handleDismiss() {
    dismissBanner();
  }

  if (phase === 'classified') {
    return (
      <div className="bg-green-50 border-b border-green-200 text-green-800 flex items-center gap-2 px-4 py-2 text-sm">
        <Check className="w-4 h-4 shrink-0" />
        <span>Clasificado como {classifiedAs}</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-300 text-amber-800 flex items-center gap-3 px-4 py-2 text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">Paciente sin clasificar — ¿Cirugía o Tratamiento?</span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
        onClick={() => handleClassify('CIRUGIA')}
      >
        Cirugía
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
        onClick={() => handleClassify('TRATAMIENTO')}
      >
        Tratamiento
      </Button>
      <button
        className="ml-1 p-1 rounded hover:bg-amber-100"
        aria-label="Descartar"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
