'use client';

import { useState } from 'react';
import { Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { useCreateHistoriaClinicaEntry, type TipoEntrada, type TipoEntradaHCValue } from '@/hooks/useCreateHistoriaClinicaEntry';
import { useTratamientosProfesional } from '@/hooks/useTratamientosProfesional';
import type { TratamientoConInsumos } from '@/types/tratamiento';
import { PrimeraConsultaForm, type PrimeraConsultaFormState } from './PrimeraConsultaForm';
import { GenerarPresupuestoModal } from './GenerarPresupuestoModal';
import type { PresupuestoItemInput } from '@/hooks/useCreatePresupuesto';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import { cn } from '@/lib/utils';

export interface HCCreatorFormProps {
  pacienteId: string;
  profesionalId: string;
  turnoId?: string;           // undefined from PatientDrawer, present from LiveTurno
  defaultFecha?: string;      // ISO date — undefined means today (backend default)
  obraSocialId?: string;      // For PrimeraConsultaForm autorizaciones
  showDatePicker?: boolean;   // true when used from PatientDrawer; false in LiveTurno (default)
  onSaved?: () => void;       // Called after successful save
}

type TipoBoton = TipoEntrada;

const TIPOS: { id: TipoBoton; label: string }[] = [
  { id: 'primera_vez', label: 'Primera Consulta' },
  { id: 'pre_quirurgico', label: 'Pre Quirúrgico' },
  { id: 'control', label: 'Control' },
  { id: 'tratamiento_en_consultorio', label: 'Tratamiento en Consultorio' },
];

const PLANTILLA_TO_TIPO_ENTRADA: Record<string, TipoEntradaHCValue> = {
  primera_vez: 'CONSULTA_CIRUGIA',
  pre_quirurgico: 'PREOPERATORIO',
  control: 'CONTROL',
  tratamiento_en_consultorio: 'TRATAMIENTO',
  libre: 'CONTROL',
  practica: 'CONTROL',
};

export function HCCreatorForm({
  pacienteId,
  profesionalId,
  turnoId,
  defaultFecha,
  obraSocialId,
  showDatePicker = false,
  onSaved,
}: HCCreatorFormProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoBoton | null>(null);

  // Estado para primera_vez
  const [pvState, setPvState] = useState<PrimeraConsultaFormState | null>(null);
  const [pvPresupuestoId, setPvPresupuestoId] = useState<string | undefined>();
  const [pvPresupuestoTotal, setPvPresupuestoTotal] = useState<number | undefined>();
  const [presupuestoModalItems, setPresupuestoModalItems] = useState<PresupuestoItemInput[] | null>(null);

  // Estado para tipos libres
  const [textoLibre, setTextoLibre] = useState('');
  const [notasLibresOpen, setNotasLibresOpen] = useState(false);

  // Estado para tratamiento_en_consultorio
  const [comboOpen, setComboOpen] = useState(false);
  const [tratamientosSeleccionados, setTratamientosSeleccionados] = useState<TratamientoConInsumos[]>([]);
  const [consumirInsumos, setConsumir] = useState(false);

  // DatePicker state
  const [selectedFecha, setSelectedFecha] = useState<string | undefined>(defaultFecha);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [saved, setSaved] = useState(false);

  const createEntry = useCreateHistoriaClinicaEntry();

  // Catalog for tratamiento_en_consultorio — loaded lazily; only active
  const { data: catalogo = [] } = useTratamientosProfesional(false, profesionalId);

  const toggleTratamiento = (t: TratamientoConInsumos) => {
    setTratamientosSeleccionados((prev) =>
      prev.some((s) => s.id === t.id)
        ? prev.filter((s) => s.id !== t.id)
        : [...prev, t],
    );
  };

  const anyHasInsumos = tratamientosSeleccionados.some((t) => t.insumos.length > 0);

  const canSave =
    tipoSeleccionado !== null &&
    (tipoSeleccionado === 'primera_vez'
      ? pvState !== null && pvState.zonas.length > 0
      : tipoSeleccionado === 'tratamiento_en_consultorio'
      ? tratamientosSeleccionados.length > 0 || textoLibre.trim().length > 0
      : textoLibre.trim().length > 0);

  const handleSave = async () => {
    if (!tipoSeleccionado) return;

    if (tipoSeleccionado === 'primera_vez') {
      if (!pvState) return;
      await createEntry.mutateAsync({
        pacienteId,
        dto: {
          tipo: 'primera_vez',
          tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado] ?? 'CONTROL',
          zonas: pvState.zonas,
          comentario: pvState.comentario,
          presupuestoId: pvPresupuestoId,
          presupuestoTotal: pvPresupuestoTotal,
          autorizaciones: pvState.autorizacion
            ? [{ obraSocialId: pvState.autorizacion.obraSocialId, codigos: pvState.autorizacion.codigos }]
            : undefined,
          ...(selectedFecha ? { fecha: selectedFecha } : {}),
        },
      });
      toast.success('HC guardada.');
    } else if (tipoSeleccionado === 'tratamiento_en_consultorio') {
      await createEntry.mutateAsync({
        pacienteId,
        dto: {
          tipo: 'tratamiento_en_consultorio',
          tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado] ?? 'CONTROL',
          tratamientoIds: tratamientosSeleccionados.map((t) => t.id),
          consumirInsumos: consumirInsumos && anyHasInsumos,
          texto: textoLibre || undefined,
          turnoId: turnoId ?? undefined,
          ...(selectedFecha ? { fecha: selectedFecha } : {}),
        },
      });
      if (consumirInsumos && anyHasInsumos) {
        toast.success('HC guardada. Orden de consumo creada.');
      } else {
        toast.success('HC guardada.');
      }
    } else {
      await createEntry.mutateAsync({
        pacienteId,
        dto: {
          tipo: tipoSeleccionado,
          tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado] ?? 'CONTROL',
          texto: textoLibre,
          ...(selectedFecha ? { fecha: selectedFecha } : {}),
        },
      });
      toast.success('HC guardada.');
    }

    setSaved(true);
    onSaved?.();
    setTimeout(() => {
      setSaved(false);
      setTipoSeleccionado(null);
      setPvState(null);
      setTextoLibre('');
      setNotasLibresOpen(false);
      setPvPresupuestoId(undefined);
      setPvPresupuestoTotal(undefined);
      setTratamientosSeleccionados([]);
      setConsumir(false);
    }, 1500);
  };

  const handlePresupuestoCreated = (presupuesto: Presupuesto) => {
    setPvPresupuestoId(presupuesto.id);
    setPvPresupuestoTotal(presupuesto.total);
    setPresupuestoModalItems(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* DatePicker (only when showDatePicker === true) */}
      {showDatePicker && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Fecha de la sesion:</span>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {selectedFecha ? format(new Date(selectedFecha), 'dd/MM/yyyy') : 'Hoy'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedFecha ? new Date(selectedFecha) : undefined}
                onSelect={(date) => {
                  setSelectedFecha(date ? date.toISOString() : undefined);
                  setDatePickerOpen(false);
                }}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Tipo selector */}
      <div className="flex gap-2 flex-wrap">
        {TIPOS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTipoSeleccionado(id);
              setSaved(false);
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
          profesionalId={profesionalId}
          onChange={(state) => setPvState(state)}
          onGenerarPresupuesto={(items) => setPresupuestoModalItems(items)}
          obraSocialId={obraSocialId}
        />
      )}

      {tipoSeleccionado === 'tratamiento_en_consultorio' && (
        <div className="flex flex-col gap-3">
          {/* Combobox multi-select */}
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between w-full">
                {tratamientosSeleccionados.length > 0
                  ? `${tratamientosSeleccionados.length} tratamiento${tratamientosSeleccionados.length > 1 ? 's' : ''} seleccionado${tratamientosSeleccionados.length > 1 ? 's' : ''}`
                  : 'Seleccionar tratamientos del catalogo...'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar tratamiento..." />
                <CommandList>
                  <CommandEmpty>No se encontraron tratamientos.</CommandEmpty>
                  {catalogo.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={t.nombre}
                      onSelect={() => toggleTratamiento(t)}
                    >
                      <span
                        className={cn(
                          'mr-2 h-4 w-4 flex items-center justify-center text-xs border rounded',
                          tratamientosSeleccionados.some((s) => s.id === t.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300',
                        )}
                      >
                        {tratamientosSeleccionados.some((s) => s.id === t.id) ? '✓' : ''}
                      </span>
                      {t.nombre}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Pills */}
          {tratamientosSeleccionados.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tratamientosSeleccionados.map((t) => (
                <Badge key={t.id} variant="secondary" className="flex items-center gap-1">
                  {t.nombre}
                  <button
                    type="button"
                    onClick={() => toggleTratamiento(t)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Quitar ${t.nombre}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Insumos checkbox — only if at least one selected treatment has insumos */}
          {anyHasInsumos && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="consumir-insumos"
                checked={consumirInsumos}
                onCheckedChange={(v) => setConsumir(Boolean(v))}
              />
              <label htmlFor="consumir-insumos" className="text-sm cursor-pointer select-none">
                Consumir insumos del stock
              </label>
            </div>
          )}

          {/* Free text toggle */}
          <div>
            <button
              type="button"
              onClick={() => setNotasLibresOpen(!notasLibresOpen)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {notasLibresOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {notasLibresOpen ? 'Ocultar notas libres' : '+ Agregar notas libres'}
            </button>
            {notasLibresOpen && (
              <Textarea
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
                placeholder="Notas adicionales..."
                rows={4}
                className="resize-none mt-2"
              />
            )}
          </div>
        </div>
      )}

      {tipoSeleccionado && tipoSeleccionado !== 'primera_vez' && tipoSeleccionado !== 'tratamiento_en_consultorio' && (
        <Textarea
          value={textoLibre}
          onChange={(e) => setTextoLibre(e.target.value)}
          placeholder={`Notas de ${TIPOS.find((t) => t.id === tipoSeleccionado)?.label ?? 'consulta'}...`}
          rows={8}
          className="resize-none"
        />
      )}

      {/* Footer */}
      {tipoSeleccionado && (
        <div className="flex items-center gap-3 pt-2 border-t">
          {pvPresupuestoId && (
            <span className="text-xs text-green-700 font-medium flex-1">Presupuesto generado</span>
          )}
          <div className="flex-1" />

          {/* Generar presupuesto */}
          {tipoSeleccionado === 'primera_vez' && !pvPresupuestoId && (pvState?.zonas.flatMap((z) => z.tratamientos).length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tratamientosPlanos = pvState?.zonas.flatMap((z) => z.tratamientos) ?? [];
                const items = tratamientosPlanos.map((t) => ({
                  descripcion: t.nombre,
                  precioTotal: t.precio,
                }));
                setPresupuestoModalItems(items);
              }}
            >
              Generar Presupuesto
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={!canSave || createEntry.isPending || saved}
            size="sm"
          >
            {createEntry.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</>
            ) : saved ? (
              'Guardado'
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
          pacienteId={pacienteId}
          profesionalId={profesionalId}
          initialItems={presupuestoModalItems}
          onCreated={handlePresupuestoCreated}
        />
      )}
    </div>
  );
}
