'use client';

import { useLiveTurnoStore } from '@/store/live-turno.store';
import { usePaciente } from '@/hooks/usePaciente';
import { useCatalogoHC } from '@/hooks/useCatalogoHC';
import { HCCreatorForm } from './hc/HCCreatorForm';
import { HistorialClinicoPanel } from './hc/HistorialClinicoPanel';

export function HistoriaClinicaTab() {
  const { session, setDraftData } = useLiveTurnoStore();
  const { data: pacienteData } = usePaciente(session?.pacienteId ?? null);

  // Prefetch del catálogo HC apenas se abre el tab, para que las zonas ya estén
  // en caché cuando el usuario elija "Primera Consulta" (evita el round-trip en el click).
  useCatalogoHC(session?.profesionalId ?? undefined, {
    enabled: !!session?.profesionalId,
  });

  if (!session) return null;

  const handleSaved = () => {
    setDraftData('hcFormDraft', undefined);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — form */}
        <div className="flex-[65] overflow-y-auto flex flex-col gap-4 pr-1 pb-2">
          <HCCreatorForm
            pacienteId={session.pacienteId}
            profesionalId={session.profesionalId}
            turnoId={session.turnoId}
            obraSocialId={pacienteData?.obraSocialId ?? undefined}
            showDatePicker={false}
            onSaved={handleSaved}
          />
        </div>

        {/* Right panel — historial */}
        <div className="flex-[35] border-l pl-4 min-h-0 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
            Historial
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <HistorialClinicoPanel pacienteId={session.pacienteId} />
          </div>
        </div>
      </div>
    </div>
  );
}
