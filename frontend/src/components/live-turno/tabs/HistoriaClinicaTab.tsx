'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useCreateHistoriaClinicaEntry, type TipoEntrada } from '@/hooks/useCreateHistoriaClinicaEntry';
import { usePaciente } from '@/hooks/usePaciente';
import { PrimeraConsultaForm, type PrimeraConsultaFormState } from './hc/PrimeraConsultaForm';
import { HistorialClinicoPanel } from './hc/HistorialClinicoPanel';
import { GenerarPresupuestoModal } from './hc/GenerarPresupuestoModal';
import type { PresupuestoItemInput } from '@/hooks/useCreatePresupuesto';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import { cn } from '@/lib/utils';

type TipoBoton = TipoEntrada;

const TIPOS: { id: TipoBoton; label: string }[] = [
  { id: 'primera_vez', label: 'Primera Consulta' },
  { id: 'pre_quirurgico', label: 'Pre Quirúrgico' },
  { id: 'control', label: 'Control' },
  { id: 'practica', label: 'Práctica' },
];

export function HistoriaClinicaTab() {
  const { session, setDraftData } = useLiveTurnoStore();
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoBoton | null>(null);

  // Estado para primera_vez
  const [pvState, setPvState] = useState<PrimeraConsultaFormState | null>(null);
  const [pvPresupuestoId, setPvPresupuestoId] = useState<string | undefined>();
  const [pvPresupuestoTotal, setPvPresupuestoTotal] = useState<number | undefined>();

  // Estado para tipos libres
  const [textoLibre, setTextoLibre] = useState('');

  // Modal generar presupuesto
  const [presupuestoModalItems, setPresupuestoModalItems] = useState<PresupuestoItemInput[] | null>(null);

  const createEntry = useCreateHistoriaClinicaEntry();
  const [saved, setSaved] = useState(false);

  const { data: pacienteData } = usePaciente(session?.pacienteId ?? null);

  if (!session) return null;

  // Persiste el borrador en el store para que el footer pueda auto-guardarlo
  const syncDraft = (
    tipo: TipoBoton | null,
    pv: PrimeraConsultaFormState | null,
    texto: string,
    presId?: string,
    presTotal?: number,
    isSaved = false,
  ) => {
    if (!tipo) {
      setDraftData('hcFormDraft', undefined);
      return;
    }
    setDraftData('hcFormDraft', {
      tipo,
      pvDiagnostico: pv?.diagnostico,
      pvTratamientos: pv?.tratamientos,
      pvComentario: pv?.comentario,
      pvPresupuestoId: presId,
      pvPresupuestoTotal: presTotal,
      textoLibre: texto,
      saved: isSaved,
    });
  };

  const handleSave = async () => {
    if (!tipoSeleccionado) return;

    if (tipoSeleccionado === 'primera_vez') {
      if (!pvState) return;
      await createEntry.mutateAsync({
        pacienteId: session.pacienteId,
        dto: {
          tipo: 'primera_vez',
          diagnostico: pvState.diagnostico,
          tratamientos: pvState.tratamientos,
          comentario: pvState.comentario,
          presupuestoId: pvPresupuestoId,
          presupuestoTotal: pvPresupuestoTotal,
          autorizaciones: pvState.autorizacion
            ? [{ obraSocialId: pvState.autorizacion.obraSocialId, codigos: pvState.autorizacion.codigos }]
            : undefined,
        },
      });
    } else {
      await createEntry.mutateAsync({
        pacienteId: session.pacienteId,
        dto: {
          tipo: tipoSeleccionado,
          texto: textoLibre,
        },
      });
    }

    // Marcar como guardado en el store
    syncDraft(tipoSeleccionado, pvState, textoLibre, pvPresupuestoId, pvPresupuestoTotal, true);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setTipoSeleccionado(null);
      setPvState(null);
      setTextoLibre('');
      setPvPresupuestoId(undefined);
      setPvPresupuestoTotal(undefined);
      setDraftData('hcFormDraft', undefined);
    }, 1500);
  };

  const handlePresupuestoCreated = (presupuesto: Presupuesto) => {
    setPvPresupuestoId(presupuesto.id);
    setPvPresupuestoTotal(presupuesto.total);
    setPresupuestoModalItems(null);
    syncDraft(tipoSeleccionado, pvState, textoLibre, presupuesto.id, presupuesto.total);
  };

  const canSave =
    tipoSeleccionado !== null &&
    (tipoSeleccionado === 'primera_vez'
      ? pvState !== null && (pvState.diagnostico.zonas.length > 0 || pvState.tratamientos.length > 0)
      : textoLibre.trim().length > 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Columnas — crecen y scrollean internamente */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — form (solo contenido, sin footer) */}
        <div className="flex-[65] overflow-y-auto flex flex-col gap-4 pr-1 pb-2">
          {/* Tipo selector */}
          <div className="flex gap-2 flex-wrap">
            {TIPOS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTipoSeleccionado(id);
                  setSaved(false);
                  syncDraft(id, pvState, textoLibre, pvPresupuestoId, pvPresupuestoTotal);
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  tipoSeleccionado === id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form area */}
          {tipoSeleccionado === 'primera_vez' && (
            <PrimeraConsultaForm
              onChange={(state) => {
                setPvState(state);
                syncDraft('primera_vez', state, textoLibre, pvPresupuestoId, pvPresupuestoTotal);
              }}
              onGenerarPresupuesto={(items) => setPresupuestoModalItems(items)}
              obraSocialId={pacienteData?.obraSocialId}
            />
          )}

          {tipoSeleccionado && tipoSeleccionado !== 'primera_vez' && (
            <Textarea
              value={textoLibre}
              onChange={(e) => {
                setTextoLibre(e.target.value);
                syncDraft(tipoSeleccionado, pvState, e.target.value);
              }}
              placeholder={`Notas de ${TIPOS.find((t) => t.id === tipoSeleccionado)?.label ?? 'consulta'}...`}
              rows={8}
              className="resize-none"
            />
          )}
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

      {/* Footer full-width — fuera de las columnas, márgenes negativos para contrarrestar p-6 del padre */}
      {tipoSeleccionado && (
        <div className="-mx-6 -mb-6 mt-4 bg-white border-t px-6 py-3 flex items-center gap-3">
          {pvPresupuestoId && (
            <span className="text-xs text-green-700 font-medium flex-1">✓ Presupuesto generado</span>
          )}
          <div className="flex-1" />

          {/* Generar presupuesto */}
          {tipoSeleccionado === 'primera_vez' && !pvPresupuestoId && (pvState?.tratamientos?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const items = (pvState?.tratamientos ?? []).map((t) => ({
                  descripcion: t.nombre,
                  precioTotal: t.precio,
                }));
                setPresupuestoModalItems(items);
              }}
            >
              Generar Presupuesto
            </Button>
          )}

          {/* Guardar */}
          <Button
            onClick={handleSave}
            disabled={!canSave || createEntry.isPending || saved}
            size="sm"
          >
            {createEntry.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</>
            ) : saved ? (
              '✓ Guardado'
            ) : (
              <><Save className="w-4 h-4 mr-1" /> Guardar</>
            )}
          </Button>
        </div>
      )}

      {/* Generar presupuesto modal */}
      {presupuestoModalItems && (
        <GenerarPresupuestoModal
          open={true}
          onClose={() => setPresupuestoModalItems(null)}
          pacienteId={session.pacienteId}
          profesionalId={session.profesionalId}
          pacienteEmail={session.pacienteEmail}
          initialItems={presupuestoModalItems}
          onCreated={handlePresupuestoCreated}
        />
      )}
    </div>
  );
}
