'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { ZONAS, CATEGORIAS_TRATAMIENTO, getSubzonas, getTratamientosCategoria } from '@/lib/zonas-diagnostico';
import { useTratamientosProfesional } from '@/hooks/useTratamientosProfesional';
import type { PresupuestoItemInput } from '@/hooks/useCreatePresupuesto';
import type { DiagnosticoDto, TratamientoItemDto } from '@/hooks/useCreateHistoriaClinicaEntry';
import { AutorizacionCodigosForm, type AutorizacionFormState } from './AutorizacionCodigosForm';

export interface PrimeraConsultaFormState {
  diagnostico: DiagnosticoDto;
  tratamientos: TratamientoItemDto[];
  comentario: string;
  autorizacion: AutorizacionFormState | null;
}

interface Props {
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

const CATEGORIA_LABELS: Record<string, string> = {
  abdominoplastia: 'Abdominoplastia',
  mastoplastia: 'Mastoplastia',
  rinoplastia: 'Rinoplastia',
  lunar_cirugia_local: 'Lunar / Cir. Local',
  tratamiento_facial: 'Tratamiento Facial',
  otros: 'Otros',
};

export function PrimeraConsultaForm({ onChange, onGenerarPresupuesto, obraSocialId }: Props) {
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([]);
  const [subzonasSeleccionadas, setSubzonasSeleccionadas] = useState<string[]>([]);
  const [otroTextoZona, setOtroTextoZona] = useState('');
  const [categoriaAbierta, setCategoriaAbierta] = useState<string | null>(null);
  const [tratamientosSeleccionados, setTratamientosSeleccionados] = useState<TratamientoItemDto[]>([]);
  const [comentario, setComentario] = useState('');
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [autorizacion, setAutorizacion] = useState<AutorizacionFormState | null>(null);

  const { data: tratamientosProfesional = [] } = useTratamientosProfesional();

  const emitChange = (
    zonas: string[],
    subzonas: string[],
    tratamientos: TratamientoItemDto[],
    coment: string,
    aut: AutorizacionFormState | null = autorizacion,
  ) => {
    onChange({
      diagnostico: { zonas, subzonas, otroTexto: otroTextoZona },
      tratamientos,
      comentario: coment,
      autorizacion: aut,
    });
  };

  const toggleZona = (zona: string) => {
    const nextZonas = zonasSeleccionadas.includes(zona)
      ? zonasSeleccionadas.filter((z) => z !== zona)
      : [...zonasSeleccionadas, zona];
    const nextSubzonas = subzonasSeleccionadas.filter((s) =>
      nextZonas.some((z) => getSubzonas(z).includes(s)),
    );
    setZonasSeleccionadas(nextZonas);
    setSubzonasSeleccionadas(nextSubzonas);
    emitChange(nextZonas, nextSubzonas, tratamientosSeleccionados, comentario);
  };

  const toggleSubzona = (subzona: string) => {
    const next = subzonasSeleccionadas.includes(subzona)
      ? subzonasSeleccionadas.filter((s) => s !== subzona)
      : [...subzonasSeleccionadas, subzona];
    setSubzonasSeleccionadas(next);
    emitChange(zonasSeleccionadas, next, tratamientosSeleccionados, comentario);
  };

  const toggleCategoria = (cat: string) => {
    setCategoriaAbierta((prev) => (prev === cat ? null : cat));
  };

  const addTratamiento = (nombre: string) => {
    const found = tratamientosProfesional.find(
      (t) => t.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    const item: TratamientoItemDto = {
      nombre,
      tratamientoId: found?.id,
      precio: found?.precio ?? 0,
    };
    const next = [...tratamientosSeleccionados, item];
    setTratamientosSeleccionados(next);
    emitChange(zonasSeleccionadas, subzonasSeleccionadas, next, comentario);
  };

  const removeTratamiento = (index: number) => {
    const next = tratamientosSeleccionados.filter((_, i) => i !== index);
    setTratamientosSeleccionados(next);
    emitChange(zonasSeleccionadas, subzonasSeleccionadas, next, comentario);
  };

  const handleComentarioChange = (val: string) => {
    setComentario(val);
    emitChange(zonasSeleccionadas, subzonasSeleccionadas, tratamientosSeleccionados, val);
  };

  const handleAutorizacionChange = (aut: AutorizacionFormState | null) => {
    setAutorizacion(aut);
    emitChange(zonasSeleccionadas, subzonasSeleccionadas, tratamientosSeleccionados, comentario, aut);
  };

  // All subzonas from selected zones (deduped)
  const subzonasDisponibles = Array.from(
    new Set(zonasSeleccionadas.flatMap((z) => getSubzonas(z))),
  );

  const handleGenerarPresupuesto = () => {
    const items: PresupuestoItemInput[] = tratamientosSeleccionados.map((t) => ({
      descripcion: t.nombre,
      precioTotal: t.precio,
    }));
    onGenerarPresupuesto(items);
  };

  return (
    <div className="space-y-5">
      {/* Diagnóstico */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Diagnóstico</h3>
        <div className="flex flex-wrap gap-2">
          {ZONAS.map((zona) => (
            <Chip
              key={zona}
              label={zona}
              selected={zonasSeleccionadas.includes(zona)}
              onClick={() => toggleZona(zona)}
            />
          ))}
        </div>

        {/* Subzonas */}
        {subzonasDisponibles.length > 0 && (
          <div className="pl-2 border-l-2 border-blue-200 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Subzonas</p>
            <div className="flex flex-wrap gap-2">
              {subzonasDisponibles.map((sub) => (
                <Chip
                  key={sub}
                  label={sub}
                  selected={subzonasSeleccionadas.includes(sub)}
                  onClick={() => toggleSubzona(sub)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Otros text */}
        {zonasSeleccionadas.includes('Otros') && (
          <Input
            value={otroTextoZona}
            onChange={(e) => setOtroTextoZona(e.target.value)}
            placeholder="Describir zona..."
            className="mt-1"
          />
        )}
      </section>

      {/* Tratamiento */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tratamiento</h3>
        {/* Categorías */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_TRATAMIENTO.map((cat) => (
            <Chip
              key={cat}
              label={CATEGORIA_LABELS[cat] ?? cat}
              selected={categoriaAbierta === cat}
              onClick={() => toggleCategoria(cat)}
            />
          ))}
        </div>

        {/* Sub-tratamientos de la categoría seleccionada */}
        {categoriaAbierta && (
          <div className="pl-2 border-l-2 border-blue-200 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Sub-tratamientos</p>
            <div className="flex flex-wrap gap-2">
              {getTratamientosCategoria(categoriaAbierta).map((nombre) => {
                const idx = tratamientosSeleccionados.findIndex((t) => t.nombre === nombre);
                const alreadyAdded = idx !== -1;
                return (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => alreadyAdded ? removeTratamiento(idx) : addTratamiento(nombre)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1',
                      alreadyAdded
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                    )}
                  >
                    {!alreadyAdded && <Plus className="w-3 h-3" />}
                    {nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </section>

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
