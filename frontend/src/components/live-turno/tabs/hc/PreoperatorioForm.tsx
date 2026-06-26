'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useAntecedentesCatalogo } from '@/hooks/useAntecedentesCatalogo';
import { useAlergiasCatalogo } from '@/hooks/useAlergiasCatalogo';
import { useMedicamentosCatalogo } from '@/hooks/useMedicamentosCatalogo';
import { usePaciente } from '@/hooks/usePaciente';
import type { ZonaSeleccionDto } from '@/hooks/useCreateHistoriaClinicaEntry';
import { PrimeraConsultaForm, type PrimeraConsultaFormState } from './PrimeraConsultaForm';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PreoperatorioFormState {
  antecedentes: string[];
  alergias: string[];
  medicacion: string[];
  estudiosComplementarios: {
    laboratorio: boolean;
    ecg: boolean;
    imagenes: string[];
  };
  consentimientoInformado: boolean;
  zonas: ZonaSeleccionDto[];
  comentario?: string;
}

interface Props {
  pacienteId: string;
  profesionalId?: string;
  obraSocialId?: string | null;
  onChange: (s: PreoperatorioFormState) => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Local Chip replicating PrimeraConsultaForm's Chip (with dashed prop for unsaved items). */
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
        'px-3 py-1.5 rounded-full text-sm border transition-colors',
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

function formatearNombre(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const IMAGENES_OPTIONS = ['Ecografía', 'Tomografía', 'Mamografía', 'Otro'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreoperatorioForm({ pacienteId, profesionalId, obraSocialId, onChange }: Props) {
  // Catalog hooks (per-professional)
  const { data: catalogoAntecedentes = [], isLoading: loadingAnt } = useAntecedentesCatalogo(profesionalId);
  const { data: catalogoAlergias = [], isLoading: loadingAle } = useAlergiasCatalogo(profesionalId);
  const { data: catalogoMedicamentos = [], isLoading: loadingMed } = useMedicamentosCatalogo(profesionalId);

  // Patient profile for pre-load (D-09)
  const { data: paciente } = usePaciente(pacienteId);

  // --- Antecedentes state ---
  const [antSelected, setAntSelected] = useState<string[]>([]);
  const [antNuevos, setAntNuevos] = useState<string[]>([]);
  const [antInputAbierto, setAntInputAbierto] = useState(false);
  const [antInputTexto, setAntInputTexto] = useState('');

  // --- Alergias state ---
  const [aleSelected, setAleSelected] = useState<string[]>([]);
  const [aleNuevos, setAleNuevos] = useState<string[]>([]);
  const [aleInputAbierto, setAleInputAbierto] = useState(false);
  const [aleInputTexto, setAleInputTexto] = useState('');

  // --- Medicacion state ---
  const [medSelected, setMedSelected] = useState<string[]>([]);
  const [medNuevos, setMedNuevos] = useState<string[]>([]);
  const [medInputAbierto, setMedInputAbierto] = useState(false);
  const [medInputTexto, setMedInputTexto] = useState('');

  // --- Estudios complementarios state (D-10 locked shape) ---
  const [estudiosComplementarios, setEstudiosComplementarios] = useState<{
    laboratorio: boolean;
    ecg: boolean;
    imagenes: string[];
  }>({ laboratorio: false, ecg: false, imagenes: [] });

  // --- Consentimiento informado (D-11) ---
  const [consentimientoInformado, setConsentimientoInformado] = useState(false);

  // --- Optional dx/tratamiento (PREOP-02/D-08) ---
  const [incluirDx, setIncluirDx] = useState(false);
  const [zonas, setZonas] = useState<ZonaSeleccionDto[]>([]);

  // Pre-load guard: run once after patient data arrives
  const preloadRef = useRef(false);

  // Emit initial state on mount so the parent always has a non-null preopState
  useEffect(() => {
    onChange({
      antecedentes: [],
      alergias: [],
      medicacion: [],
      estudiosComplementarios: { laboratorio: false, ecg: false, imagenes: [] },
      consentimientoInformado: false,
      zonas: [],
      comentario: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-load from patient profile (D-09): condiciones→antecedentes, alergias, medicacion
  useEffect(() => {
    if (preloadRef.current) return;
    if (!paciente) return;

    preloadRef.current = true;

    const condiciones: string[] = paciente.condiciones ?? [];
    const alergias: string[] = paciente.alergias ?? [];
    const medicacion: string[] = paciente.medicacion ?? [];

    if (condiciones.length > 0) {
      setAntSelected(condiciones);
      // Items not in catalog become dashed chips
      const nuevos = condiciones.filter(
        (c) => !catalogoAntecedentes.some((ca) => ca.nombre.toLowerCase() === c.toLowerCase()),
      );
      setAntNuevos(nuevos);
    }

    if (alergias.length > 0) {
      setAleSelected(alergias);
      const nuevos = alergias.filter(
        (a) => !catalogoAlergias.some((ca) => ca.nombre.toLowerCase() === a.toLowerCase()),
      );
      setAleNuevos(nuevos);
    }

    if (medicacion.length > 0) {
      setMedSelected(medicacion);
      const nuevos = medicacion.filter(
        (m) => !catalogoMedicamentos.some((cm) => cm.nombre.toLowerCase() === m.toLowerCase()),
      );
      setMedNuevos(nuevos);
    }

    // Emit the pre-loaded state immediately (state setters are async, so pass values directly)
    onChange({
      antecedentes: condiciones,
      alergias: alergias,
      medicacion: medicacion,
      estudiosComplementarios: { laboratorio: false, ecg: false, imagenes: [] },
      consentimientoInformado: false,
      zonas: [],
      comentario: undefined,
    });
  }, [paciente, catalogoAntecedentes, catalogoAlergias, catalogoMedicamentos]);

  // ---------------------------------------------------------------------------
  // emitChange — always passes the full state shape
  // ---------------------------------------------------------------------------
  const emitChange = (
    ant: string[],
    ale: string[],
    med: string[],
    est: { laboratorio: boolean; ecg: boolean; imagenes: string[] },
    consent: boolean,
    z: ZonaSeleccionDto[],
    comt?: string,
  ) => {
    onChange({
      antecedentes: ant,
      alergias: ale,
      medicacion: med,
      estudiosComplementarios: est,
      consentimientoInformado: consent,
      zonas: z,
      comentario: comt,
    });
  };

  // ---------------------------------------------------------------------------
  // Antecedentes handlers
  // ---------------------------------------------------------------------------
  const toggleAntecedente = (nombre: string) => {
    const next = antSelected.some((s) => s.toLowerCase() === nombre.toLowerCase())
      ? antSelected.filter((s) => s.toLowerCase() !== nombre.toLowerCase())
      : [...antSelected, nombre];
    setAntSelected(next);
    emitChange(next, aleSelected, medSelected, estudiosComplementarios, consentimientoInformado, zonas);
  };

  const handleAntOtroEnter = () => {
    const nombre = formatearNombre(antInputTexto);
    if (!nombre) return;

    const yaEnSeleccion = antSelected.some((s) => s.toLowerCase() === nombre.toLowerCase());
    if (yaEnSeleccion) {
      setAntInputTexto('');
      return;
    }

    const next = [...antSelected, nombre];
    setAntSelected(next);

    const esCatalogo = catalogoAntecedentes.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (!esCatalogo) {
      setAntNuevos((prev) => [...prev, nombre]);
    }

    setAntInputTexto('');
    emitChange(next, aleSelected, medSelected, estudiosComplementarios, consentimientoInformado, zonas);
  };

  // ---------------------------------------------------------------------------
  // Alergias handlers
  // ---------------------------------------------------------------------------
  const toggleAlergia = (nombre: string) => {
    const next = aleSelected.some((s) => s.toLowerCase() === nombre.toLowerCase())
      ? aleSelected.filter((s) => s.toLowerCase() !== nombre.toLowerCase())
      : [...aleSelected, nombre];
    setAleSelected(next);
    emitChange(antSelected, next, medSelected, estudiosComplementarios, consentimientoInformado, zonas);
  };

  const handleAleOtroEnter = () => {
    const nombre = formatearNombre(aleInputTexto);
    if (!nombre) return;

    const yaEnSeleccion = aleSelected.some((s) => s.toLowerCase() === nombre.toLowerCase());
    if (yaEnSeleccion) {
      setAleInputTexto('');
      return;
    }

    const next = [...aleSelected, nombre];
    setAleSelected(next);

    const esCatalogo = catalogoAlergias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (!esCatalogo) {
      setAleNuevos((prev) => [...prev, nombre]);
    }

    setAleInputTexto('');
    emitChange(antSelected, next, medSelected, estudiosComplementarios, consentimientoInformado, zonas);
  };

  // ---------------------------------------------------------------------------
  // Medicacion handlers
  // ---------------------------------------------------------------------------
  const toggleMedicacion = (nombre: string) => {
    const next = medSelected.some((s) => s.toLowerCase() === nombre.toLowerCase())
      ? medSelected.filter((s) => s.toLowerCase() !== nombre.toLowerCase())
      : [...medSelected, nombre];
    setMedSelected(next);
    emitChange(antSelected, aleSelected, next, estudiosComplementarios, consentimientoInformado, zonas);
  };

  const handleMedOtroEnter = () => {
    const nombre = formatearNombre(medInputTexto);
    if (!nombre) return;

    const yaEnSeleccion = medSelected.some((s) => s.toLowerCase() === nombre.toLowerCase());
    if (yaEnSeleccion) {
      setMedInputTexto('');
      return;
    }

    const next = [...medSelected, nombre];
    setMedSelected(next);

    const esCatalogo = catalogoMedicamentos.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (!esCatalogo) {
      setMedNuevos((prev) => [...prev, nombre]);
    }

    setMedInputTexto('');
    emitChange(antSelected, aleSelected, next, estudiosComplementarios, consentimientoInformado, zonas);
  };

  // ---------------------------------------------------------------------------
  // Estudios handlers
  // ---------------------------------------------------------------------------
  const handleEstudiosChange = (partial: Partial<{ laboratorio: boolean; ecg: boolean; imagenes: string[] }>) => {
    const next = { ...estudiosComplementarios, ...partial };
    setEstudiosComplementarios(next);
    emitChange(antSelected, aleSelected, medSelected, next, consentimientoInformado, zonas);
  };

  const toggleImagen = (imagen: string) => {
    const next = estudiosComplementarios.imagenes.includes(imagen)
      ? estudiosComplementarios.imagenes.filter((i) => i !== imagen)
      : [...estudiosComplementarios.imagenes, imagen];
    handleEstudiosChange({ imagenes: next });
  };

  // ---------------------------------------------------------------------------
  // Render helper: a single chip section
  // ---------------------------------------------------------------------------
  type CatItem = { id: string; nombre: string; esSistema: boolean };

  const renderChipSection = ({
    title,
    catalogo,
    isLoading,
    selected,
    nuevos,
    inputAbierto,
    inputTexto,
    onToggle,
    onInputAbiertoToggle,
    onInputChange,
    onEnter,
  }: {
    title: string;
    catalogo: CatItem[];
    isLoading: boolean;
    selected: string[];
    nuevos: string[];
    inputAbierto: boolean;
    inputTexto: string;
    onToggle: (nombre: string) => void;
    onInputAbiertoToggle: () => void;
    onInputChange: (v: string) => void;
    onEnter: () => void;
  }) => {
    // Merge: catalog items + extra items (from profile or Otro) not already in catalog
    const extraItems = nuevos
      .filter((n) => !catalogo.some((c) => c.nombre.toLowerCase() === n.toLowerCase()))
      .map((n) => ({ id: `extra-${n}`, nombre: n, isExtra: true }));

    const allItems: { id: string; nombre: string; isExtra: boolean }[] = [
      ...catalogo.map((c) => ({ id: c.id, nombre: c.nombre, isExtra: false })),
      ...extraItems,
    ];

    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando catálogo...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allItems.map((item) => {
              const isSelected = selected.some((s) => s.toLowerCase() === item.nombre.toLowerCase());
              return (
                <Chip
                  key={item.id}
                  label={item.nombre}
                  selected={isSelected}
                  dashed={item.isExtra}
                  onClick={() => onToggle(item.nombre)}
                />
              );
            })}
            {/* "Otro" chip that toggles the free-text input */}
            <Chip
              label="Otro"
              selected={inputAbierto}
              onClick={onInputAbiertoToggle}
            />
          </div>
        )}

        {inputAbierto && (
          <Input
            value={inputTexto}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnter();
              }
            }}
            placeholder="Escribir y presionar Enter para agregar..."
            autoFocus
          />
        )}
      </section>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Section: Antecedentes */}
      {renderChipSection({
        title: 'Antecedentes',
        catalogo: catalogoAntecedentes,
        isLoading: loadingAnt,
        selected: antSelected,
        nuevos: antNuevos,
        inputAbierto: antInputAbierto,
        inputTexto: antInputTexto,
        onToggle: toggleAntecedente,
        onInputAbiertoToggle: () => setAntInputAbierto((v) => !v),
        onInputChange: (v) => setAntInputTexto(v),
        onEnter: handleAntOtroEnter,
      })}

      {/* Section: Alergias */}
      {renderChipSection({
        title: 'Alergias',
        catalogo: catalogoAlergias,
        isLoading: loadingAle,
        selected: aleSelected,
        nuevos: aleNuevos,
        inputAbierto: aleInputAbierto,
        inputTexto: aleInputTexto,
        onToggle: toggleAlergia,
        onInputAbiertoToggle: () => setAleInputAbierto((v) => !v),
        onInputChange: (v) => setAleInputTexto(v),
        onEnter: handleAleOtroEnter,
      })}

      {/* Section: Medicación */}
      {renderChipSection({
        title: 'Medicación',
        catalogo: catalogoMedicamentos,
        isLoading: loadingMed,
        selected: medSelected,
        nuevos: medNuevos,
        inputAbierto: medInputAbierto,
        inputTexto: medInputTexto,
        onToggle: toggleMedicacion,
        onInputAbiertoToggle: () => setMedInputAbierto((v) => !v),
        onInputChange: (v) => setMedInputTexto(v),
        onEnter: handleMedOtroEnter,
      })}

      {/* Section: Diagnóstico / Tratamiento — optional, collapsed by default (PREOP-02/D-08) */}
      <section className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="incluir-dx"
            checked={incluirDx}
            onCheckedChange={(v) => {
              const checked = Boolean(v);
              setIncluirDx(checked);
              if (!checked) {
                setZonas([]);
                emitChange(antSelected, aleSelected, medSelected, estudiosComplementarios, consentimientoInformado, []);
              }
            }}
          />
          <label
            htmlFor="incluir-dx"
            className="text-sm font-medium cursor-pointer select-none"
          >
            Agregar diagnóstico / tratamiento
          </label>
        </div>

        {incluirDx && (
          <div className="pl-2 border-l-2 border-blue-200">
            {/* Reuse PrimeraConsultaForm as the zona/dx/tratamiento selector (D-08) */}
            <PrimeraConsultaForm
              profesionalId={profesionalId}
              obraSocialId={obraSocialId}
              onChange={(state: PrimeraConsultaFormState) => {
                setZonas(state.zonas);
                emitChange(antSelected, aleSelected, medSelected, estudiosComplementarios, consentimientoInformado, state.zonas, state.comentario);
              }}
              onGenerarPresupuesto={() => {
                // Presupuesto generation is not applicable in PREOP context
              }}
            />
          </div>
        )}
      </section>

      {/* Section: Estudios complementarios (D-10) */}
      <section className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Estudios Complementarios
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="est-laboratorio"
              checked={estudiosComplementarios.laboratorio}
              onCheckedChange={(v) => handleEstudiosChange({ laboratorio: Boolean(v) })}
            />
            <label htmlFor="est-laboratorio" className="text-sm cursor-pointer select-none">
              Laboratorio
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="est-ecg"
              checked={estudiosComplementarios.ecg}
              onCheckedChange={(v) => handleEstudiosChange({ ecg: Boolean(v) })}
            />
            <label htmlFor="est-ecg" className="text-sm cursor-pointer select-none">
              ECG
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Imágenes</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {IMAGENES_OPTIONS.map((imagen) => (
              <div key={imagen} className="flex items-center gap-2">
                <Checkbox
                  id={`imagen-${imagen}`}
                  checked={estudiosComplementarios.imagenes.includes(imagen)}
                  onCheckedChange={() => toggleImagen(imagen)}
                />
                <label htmlFor={`imagen-${imagen}`} className="text-sm cursor-pointer select-none">
                  {imagen}
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section: Consentimiento informado (D-11) — "informado" only, NOT signature */}
      <section className="border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="consentimiento-informado"
            checked={consentimientoInformado}
            onCheckedChange={(v) => {
              const checked = Boolean(v);
              setConsentimientoInformado(checked);
              emitChange(antSelected, aleSelected, medSelected, estudiosComplementarios, checked, zonas);
            }}
          />
          <label
            htmlFor="consentimiento-informado"
            className="text-sm cursor-pointer select-none"
          >
            El paciente fue informado sobre el consentimiento quirúrgico
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Registra que el profesional informó al paciente. La firma del consentimiento se gestiona por separado.
        </p>
      </section>
    </div>
  );
}
