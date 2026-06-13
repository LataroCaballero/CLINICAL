'use client';

import { useRef, useState } from 'react';
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

/** Normaliza nombre: trim + primera letra mayúscula */
function formatearNombre(raw: string): string {
  const t = raw.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Chip({
  label,
  selected,
  dashed,
  onClick,
}: {
  label: string;
  selected: boolean;
  dashed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
        dashed && selected
          ? 'bg-blue-600 text-white border-2 border-dashed border-blue-300'
          : dashed && !selected
            ? 'bg-white text-gray-700 border-2 border-dashed border-gray-400 hover:border-blue-400'
            : selected
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
  // Zonas creadas client-side (Enter en input "Otros")
  const [zonasNuevas, setZonasNuevas] = useState<ZonaHC[]>([]);
  // Input text para el input de "Otros" zona (keyed by zonaId de la zona "Otros" sistema)
  const [otroTextos, setOtroTextos] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState('');
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [autorizacion, setAutorizacion] = useState<AutorizacionFormState | null>(null);

  // Estado para inputs de diagnósticos nuevos: abierto/cerrado + texto por zonaId
  const [dxInputAbierto, setDxInputAbierto] = useState<Record<string, boolean>>({});
  const [dxInputTexto, setDxInputTexto] = useState<Record<string, string>>({});
  // Track de nombres de dx nuevos por zonaId (para renderizarlos como chips punteados)
  const [dxNuevos, setDxNuevos] = useState<Record<string, string[]>>({});

  // Estado para inputs de tratamientos nuevos
  const [txInputAbierto, setTxInputAbierto] = useState<Record<string, boolean>>({});
  const [txInputTexto, setTxInputTexto] = useState<Record<string, string>>({});
  // Track de TratamientoItemDto nuevos por zonaId
  const [txNuevos, setTxNuevos] = useState<Record<string, TratamientoItemDto[]>>({});

  // Counter for stable temp IDs (avoids calling Date.now/Math.random during render)
  const zonaNuevaCounter = useRef(0);

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

  /**
   * Enter en el input de zona "Otros": crea una zona nueva client-side al instante.
   * Si el nombre ya existe (catálogo o zonasNuevas) se selecciona la existente sin duplicar.
   */
  const handleZonaOtrosEnter = (zonaOtrosId: string, texto: string) => {
    const nombre = formatearNombre(texto);
    if (!nombre) return;

    // Check duplicado en catálogo
    const existenteEnCatalogo = catalogo.find(
      (z) => z.nombre.toLowerCase().trim() === nombre.toLowerCase(),
    );
    if (existenteEnCatalogo) {
      // Seleccionar la existente si no está seleccionada
      const yaSeleccionada = zonasSeleccionadas.some((s) => s.zonaId === existenteEnCatalogo.id);
      if (!yaSeleccionada) {
        const next = [
          ...zonasSeleccionadas,
          { zonaId: existenteEnCatalogo.id, zona: existenteEnCatalogo.nombre, diagnosticos: [], tratamientos: [] },
        ];
        setZonasSeleccionadas(next);
        emitChange(next, comentario, autorizacion);
      }
      // Limpiar input
      setOtroTextos((prev) => ({ ...prev, [zonaOtrosId]: '' }));
      return;
    }

    // Check duplicado en zonasNuevas
    const existenteNueva = zonasNuevas.find(
      (z) => z.nombre.toLowerCase().trim() === nombre.toLowerCase(),
    );
    if (existenteNueva) {
      // Seleccionar la existente si no está seleccionada
      const yaSeleccionada = zonasSeleccionadas.some((s) => s.zonaId === existenteNueva.id);
      if (!yaSeleccionada) {
        const next = [
          ...zonasSeleccionadas,
          { zonaId: existenteNueva.id, zona: existenteNueva.nombre, diagnosticos: [], tratamientos: [] },
        ];
        setZonasSeleccionadas(next);
        emitChange(next, comentario, autorizacion);
      }
      setOtroTextos((prev) => ({ ...prev, [zonaOtrosId]: '' }));
      return;
    }

    // Crear zona nueva (ID estable usando contador de ref)
    zonaNuevaCounter.current += 1;
    const tempId = `nueva-${zonaNuevaCounter.current}`;
    const nuevaZona: ZonaHC = {
      id: tempId,
      nombre,
      orden: 9999,
      esSistema: false,
      diagnosticos: [],
      tratamientos: [],
    };
    setZonasNuevas((prev) => [...prev, nuevaZona]);

    const next = [
      ...zonasSeleccionadas,
      { zonaId: tempId, zona: nombre, diagnosticos: [], tratamientos: [] },
    ];
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);

    // Limpiar input (queda libre para otra zona)
    setOtroTextos((prev) => ({ ...prev, [zonaOtrosId]: '' }));
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

  /**
   * Enter en el input "Otros" de diagnósticos:
   * crea o selecciona un dx nuevo y lo agrega a la selección.
   */
  const handleDxNuevoEnter = (zonaId: string) => {
    const texto = dxInputTexto[zonaId] ?? '';
    const nombre = formatearNombre(texto);
    if (!nombre) return;

    // Buscar si ya existe (en selección actual — cubre catálogo + nuevos)
    const selState = zonasSeleccionadas.find((s) => s.zonaId === zonaId);
    if (!selState) return;

    const yaEnSeleccion = selState.diagnosticos.some(
      (d) => d.toLowerCase() === nombre.toLowerCase(),
    );

    if (yaEnSeleccion) {
      // Solo limpiar input
      setDxInputTexto((prev) => ({ ...prev, [zonaId]: '' }));
      return;
    }

    // Agregar a selección + track de nuevos
    const next = zonasSeleccionadas.map((s) => {
      if (s.zonaId !== zonaId) return s;
      return { ...s, diagnosticos: [...s.diagnosticos, nombre] };
    });
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);

    setDxNuevos((prev) => ({
      ...prev,
      [zonaId]: [...(prev[zonaId] ?? []), nombre],
    }));

    // Limpiar input y dejarlo abierto
    setDxInputTexto((prev) => ({ ...prev, [zonaId]: '' }));
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

  /**
   * Enter en el input "Otros" de tratamientos:
   * crea un tx nuevo con precio resuelto por lookup o 0.
   */
  const handleTxNuevoEnter = (zonaId: string) => {
    const texto = txInputTexto[zonaId] ?? '';
    const nombre = formatearNombre(texto);
    if (!nombre) return;

    const selState = zonasSeleccionadas.find((s) => s.zonaId === zonaId);
    if (!selState) return;

    // Verificar si ya está seleccionado
    const yaEnSeleccion = selState.tratamientos.some(
      (tx) => tx.nombre.toLowerCase() === nombre.toLowerCase(),
    );

    if (yaEnSeleccion) {
      setTxInputTexto((prev) => ({ ...prev, [zonaId]: '' }));
      return;
    }

    // Precio lookup
    const fallback = tratamientosProfesional.find(
      (tp) => tp.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    const item: TratamientoItemDto = {
      nombre,
      tratamientoId: fallback?.id,
      precio: fallback?.precio ?? 0,
    };

    const next = zonasSeleccionadas.map((s) => {
      if (s.zonaId !== zonaId) return s;
      return { ...s, tratamientos: [...s.tratamientos, item] };
    });
    setZonasSeleccionadas(next);
    emitChange(next, comentario, autorizacion);

    setTxNuevos((prev) => ({
      ...prev,
      [zonaId]: [...(prev[zonaId] ?? []), item],
    }));

    // Limpiar input y dejarlo abierto
    setTxInputTexto((prev) => ({ ...prev, [zonaId]: '' }));
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
  const zonasOrdenadas: ZonaHC[] = [...catalogo].sort((a, b) => a.orden - b.orden);

  // Merge: zonasNuevas inserted before the "Otros" sistema zone
  const otrosSistemaIdx = zonasOrdenadas.findIndex(
    (z) => z.nombre.toLowerCase() === 'otros',
  );
  const zonasConNuevas: ZonaHC[] =
    zonasNuevas.length === 0
      ? zonasOrdenadas
      : otrosSistemaIdx === -1
        ? [...zonasOrdenadas, ...zonasNuevas]
        : [
            ...zonasOrdenadas.slice(0, otrosSistemaIdx),
            ...zonasNuevas,
            ...zonasOrdenadas.slice(otrosSistemaIdx),
          ];

  // Selected zones in merged order
  const zonasSeleccionadasOrdenadas = zonasConNuevas.filter((z) =>
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
            {zonasConNuevas.map((zona) => {
              const isNueva = zonasNuevas.some((n) => n.id === zona.id);
              const isOtros = zona.nombre.toLowerCase() === 'otros';
              // La zona "Otros" sistema siempre se renderiza como chip y su input está abajo
              return (
                <Chip
                  key={zona.id}
                  label={zona.nombre}
                  selected={zonasSeleccionadas.some((s) => s.zonaId === zona.id)}
                  dashed={isNueva}
                  onClick={() => (isOtros ? undefined : toggleZona(zona))}
                />
              );
            })}
          </div>
        )}

        {/* Input para crear zona nueva (debajo de chips, en el contexto de la zona "Otros") */}
        {catalogo.some((z) => z.nombre.toLowerCase() === 'otros') && (() => {
          const zonaOtros = catalogo.find((z) => z.nombre.toLowerCase() === 'otros')!;
          return (
            <Input
              value={otroTextos[zonaOtros.id] ?? ''}
              onChange={(e) =>
                setOtroTextos((prev) => ({ ...prev, [zonaOtros.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleZonaOtrosEnter(zonaOtros.id, otroTextos[zonaOtros.id] ?? '');
                }
              }}
              placeholder="Nueva zona... (Enter para agregar)"
            />
          );
        })()}
      </section>

      {/* Groups for selected zones */}
      {zonasSeleccionadasOrdenadas.map((zona) => {
        const selState = zonasSeleccionadas.find((s) => s.zonaId === zona.id)!;
        const isNuevaZona = zonasNuevas.some((n) => n.id === zona.id);

        // Para zonas nuevas: solo la opción "Otros" sintética
        const diagnosticosOrdenados = isNuevaZona
          ? [{ id: `otros-${zona.id}`, nombre: 'Otros', esSistema: true, orden: 9999 }]
          : [...zona.diagnosticos].sort((a, b) => a.orden - b.orden);

        const tratamientosOrdenados = isNuevaZona
          ? [{ id: `otros-tx-${zona.id}`, nombre: 'Otros', esSistema: true, orden: 9999, tratamientoId: null, precio: null }]
          : [...zona.tratamientos].sort((a, b) => a.orden - b.orden);

        return (
          <div key={zona.id} className="pl-2 border-l-2 border-blue-200 space-y-3">
            {/* Zone label */}
            <p className="text-xs font-semibold uppercase text-blue-700">{zona.nombre}</p>

            {/* Diagnósticos — siempre mostrar para zonas nuevas */}
            {(isNuevaZona || diagnosticosOrdenados.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Diagnósticos</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosticosOrdenados.map((dx) => {
                    const esChipOtros = dx.nombre.toLowerCase() === 'otros';
                    const esNuevo = (dxNuevos[zona.id] ?? []).includes(dx.nombre);
                    const isSelected = selState.diagnosticos.includes(dx.nombre);

                    if (esChipOtros) {
                      // Chip "Otros" alterna el input, no agrega "Otros" al array
                      return (
                        <Chip
                          key={dx.id}
                          label={dx.nombre}
                          selected={!!dxInputAbierto[zona.id]}
                          onClick={() =>
                            setDxInputAbierto((prev) => ({
                              ...prev,
                              [zona.id]: !prev[zona.id],
                            }))
                          }
                        />
                      );
                    }

                    return (
                      <Chip
                        key={dx.id}
                        label={dx.nombre}
                        selected={isSelected}
                        dashed={esNuevo}
                        onClick={() => toggleDiagnostico(zona.id, dx.nombre)}
                      />
                    );
                  })}
                </div>
                {/* Input para dx nuevo */}
                {dxInputAbierto[zona.id] && (
                  <Input
                    value={dxInputTexto[zona.id] ?? ''}
                    onChange={(e) =>
                      setDxInputTexto((prev) => ({ ...prev, [zona.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleDxNuevoEnter(zona.id);
                      }
                    }}
                    placeholder="Describir diagnóstico..."
                    autoFocus
                  />
                )}
                {/* Chips de dx nuevos */}
                {(dxNuevos[zona.id] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(dxNuevos[zona.id] ?? []).map((nombre) => (
                      <Chip
                        key={`dx-nuevo-${nombre}`}
                        label={nombre}
                        selected={selState.diagnosticos.includes(nombre)}
                        dashed
                        onClick={() => toggleDiagnostico(zona.id, nombre)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tratamientos — siempre mostrar para zonas nuevas */}
            {(isNuevaZona || tratamientosOrdenados.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Tratamientos</p>
                <div className="flex flex-wrap gap-2">
                  {tratamientosOrdenados.map((t) => {
                    const esChipOtros = t.nombre.toLowerCase() === 'otros';
                    const esNuevo = (txNuevos[zona.id] ?? []).some((tx) => tx.nombre === t.nombre);
                    const alreadyAdded = selState.tratamientos.some((tx) => tx.nombre === t.nombre);

                    if (esChipOtros) {
                      // Chip "Otros" alterna el input de tx
                      return (
                        <Chip
                          key={t.id}
                          label={t.nombre}
                          selected={!!txInputAbierto[zona.id]}
                          onClick={() =>
                            setTxInputAbierto((prev) => ({
                              ...prev,
                              [zona.id]: !prev[zona.id],
                            }))
                          }
                        />
                      );
                    }

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTratamiento(zona.id, t as TratamientoHC)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1',
                          esNuevo && alreadyAdded
                            ? 'bg-blue-600 text-white border-2 border-dashed border-blue-300'
                            : esNuevo && !alreadyAdded
                              ? 'bg-white text-gray-700 border-2 border-dashed border-gray-400 hover:border-blue-400'
                              : alreadyAdded
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
                {/* Input para tx nuevo */}
                {txInputAbierto[zona.id] && (
                  <Input
                    value={txInputTexto[zona.id] ?? ''}
                    onChange={(e) =>
                      setTxInputTexto((prev) => ({ ...prev, [zona.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTxNuevoEnter(zona.id);
                      }
                    }}
                    placeholder="Describir tratamiento..."
                    autoFocus
                  />
                )}
                {/* Chips de tx nuevos */}
                {(txNuevos[zona.id] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(txNuevos[zona.id] ?? []).map((item) => (
                      <button
                        key={`tx-nuevo-${item.nombre}`}
                        type="button"
                        onClick={() => {
                          // Toggle del tx nuevo
                          const next = zonasSeleccionadas.map((s) => {
                            if (s.zonaId !== zona.id) return s;
                            const idx = s.tratamientos.findIndex((tx) => tx.nombre === item.nombre);
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
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1',
                          selState.tratamientos.some((tx) => tx.nombre === item.nombre)
                            ? 'bg-blue-600 text-white border-2 border-dashed border-blue-300'
                            : 'bg-white text-gray-700 border-2 border-dashed border-gray-400 hover:border-blue-400',
                        )}
                      >
                        {!selState.tratamientos.some((tx) => tx.nombre === item.nombre) && (
                          <Plus className="w-3 h-3" />
                        )}
                        {item.nombre}
                      </button>
                    ))}
                  </div>
                )}
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
