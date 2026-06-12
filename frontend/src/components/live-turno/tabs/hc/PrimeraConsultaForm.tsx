'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';
import { useCatalogoHC } from '@/hooks/useCatalogoHC';
import { useTratamientosProfesional } from '@/hooks/useTratamientosProfesional';
import type { ZonaHC, TratamientoHC } from '@/types/catalogo-hc';
import type { PresupuestoItemInput } from '@/hooks/useCreatePresupuesto';
import type { ZonaSeleccionDto, TratamientoItemDto } from '@/hooks/useCreateHistoriaClinicaEntry';
import { AutorizacionCodigosForm, type AutorizacionFormState } from './AutorizacionCodigosForm';

export interface PrimeraConsultaFormState {
  zonas: ZonaSeleccionDto[];
  comentario: string;
  autorizacion: AutorizacionFormState | null;
}

interface Props {
  profesionalId?: string | null;
  onChange: (state: PrimeraConsultaFormState) => void;
  onGenerarPresupuesto: (items: PresupuestoItemInput[]) => void;
  obraSocialId?: string | null;
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
        selected
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
      )}
    >
      {label}
    </button>
  );
}

export function PrimeraConsultaForm({ profesionalId, onChange, onGenerarPresupuesto, obraSocialId }: Props) {
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<ZonaSeleccionDto[]>([]);
  const [otroTextos, setOtroTextos] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState('');
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [autorizacion, setAutorizacion] = useState<AutorizacionFormState | null>(null);

  const { data: catalogo = [], isLoading } = useCatalogoHC(profesionalId ?? undefined, {
    enabled: !!profesionalId,
  });
  const { data: tratamientosProfesional = [] } = useTratamientosProfesional();

  const emitChange = (
    zonas: ZonaSeleccionDto[],
    coment: string,
    aut: AutorizacionFormState | null,
  ) => {
    onChange({ zonas, comentario: coment, autorizacion: aut });
  };

  const toggleZona = (z: ZonaHC) => {
    const exists = zonasSeleccionadas.find((s) => s.zonaId === z.id);
    const next = exists
      ? zonasSeleccionadas.filter((s) => s.zonaId !== z.id)
      : [...zonasSeleccionadas, { zonaId: z.id, zona: z.nombre, diagnosticos: [], tratamientos: [] }];
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);
  };

  const toggleDiagnostico = (zonaId: string, nombre: string) => {
    const next = zonasSeleccionadas.map((s) => {
      if (s.zonaId !== zonaId) return s;
      const hasDx = s.diagnosticos.includes(nombre);
      return {
        ...s,
        diagnosticos: hasDx
          ? s.diagnosticos.filter((d) => d !== nombre)
          : [...s.diagnosticos, nombre],
      };
    });
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);
  };

  const toggleTratamiento = (zonaId: string, t: TratamientoHC) => {
    // FORM-04 price lookup: catalog already resolves precio via backend join;
    // fallback covers items without FK
    const fallback = tratamientosProfesional.find(
      (tp) => tp.nombre.toLowerCase() === t.nombre.toLowerCase(),
    );
    const item: TratamientoItemDto = {
      nombre: t.nombre,
      tratamientoId: t.tratamientoId ?? fallback?.id,
      precio: t.precio ?? fallback?.precio ?? 0,
    };

    const next = zonasSeleccionadas.map((s) => {
      if (s.zonaId !== zonaId) return s;
      const idx = s.tratamientos.findIndex((tx) => tx.nombre === t.nombre);
      return {
        ...s,
        tratamientos:
          idx === -1
            ? [...s.tratamientos, item]
            : s.tratamientos.filter((_, i) => i !== idx),
      };
    });
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);
  };

  const handleOtroTextoChange = (zonaId: string, value: string) => {
    setOtroTextos((prev) => ({ ...prev, [zonaId]: value }));
    const next = zonasSeleccionadas.map((s) =>
      s.zonaId === zonaId ? { ...s, otroTexto: value } : s,
    );
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);
  };

  const handleComentarioChange = (val: string) => {
    setComentario(val);
    emitChange(zonasSeleccionadas, val, autorizacion);
  };

  const handleAutorizacionChange = (aut: AutorizacionFormState | null) => {
    setAutorizacion(aut);
    emitChange(zonasSeleccionadas, comentario, aut);
  };

  // Sorted catalog zones by orden
  const zonasOrdenadas = [...catalogo].sort((a, b) => a.orden - b.orden);

  // Selected zones in catalog order
  const zonasSeleccionadasOrdenadas = zonasOrdenadas.filter((z) =>
    zonasSeleccionadas.some((s) => s.zonaId === z.id),
  );

  return (
    <div className="space-y-5">
      {/* Zona chips */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Zonas</h3>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando catálogo...
          </div>
        ) : catalogo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin catálogo disponible</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {zonasOrdenadas.map((zona) => (
              <Chip
                key={zona.id}
                label={zona.nombre}
                selected={zonasSeleccionadas.some((s) => s.zonaId === zona.id)}
                onClick={() => toggleZona(zona)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Groups for selected zones */}
      {zonasSeleccionadasOrdenadas.map((zona) => {
        const selState = zonasSeleccionadas.find((s) => s.zonaId === zona.id)!;
        const diagnosticosOrdenados = [...zona.diagnosticos].sort((a, b) => a.orden - b.orden);
        const tratamientosOrdenados = [...zona.tratamientos].sort((a, b) => a.orden - b.orden);
        const isOtros = zona.nombre.toLowerCase() === 'otros';

        return (
          <div key={zona.id} className="pl-2 border-l-2 border-blue-200 space-y-3">
            {/* Zone label */}
            <p className="text-xs font-semibold uppercase text-blue-700">{zona.nombre}</p>

            {/* Otros: free text input */}
            {isOtros && (
              <Input
                value={otroTextos[zona.id] ?? ''}
                onChange={(e) => handleOtroTextoChange(zona.id, e.target.value)}
                placeholder="Describir zona..."
              />
            )}

            {/* Diagnósticos */}
            {diagnosticosOrdenados.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Diagnósticos</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosticosOrdenados.map((dx) => (
                    <Chip
                      key={dx.id}
                      label={dx.nombre}
                      selected={selState.diagnosticos.includes(dx.nombre)}
                      onClick={() => toggleDiagnostico(zona.id, dx.nombre)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tratamientos */}
            {tratamientosOrdenados.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Tratamientos</p>
                <div className="flex flex-wrap gap-2">
                  {tratamientosOrdenados.map((t) => {
                    const alreadyAdded = selState.tratamientos.some((tx) => tx.nombre === t.nombre);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTratamiento(zona.id, t)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1',
                          alreadyAdded
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                        )}
                      >
                        {!alreadyAdded && <Plus className="w-3 h-3" />}
                        {t.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Comentario */}
      {!mostrarComentario ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1"
          onClick={() => setMostrarComentario(true)}
        >
          <Plus className="w-3 h-3" /> Agregar comentario
        </Button>
      ) : (
        <Textarea
          value={comentario}
          onChange={(e) => handleComentarioChange(e.target.value)}
          placeholder="Comentarios de la consulta..."
          rows={3}
        />
      )}

      {/* Autorización obra social */}
      <AutorizacionCodigosForm
        obraSocialId={obraSocialId}
        onChange={handleAutorizacionChange}
      />
    </div>
  );
}
