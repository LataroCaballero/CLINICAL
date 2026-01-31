'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTratamientosProfesional } from '@/hooks/useTratamientosProfesional';
import type { TreatmentNode as TreatmentNodeType } from '@/types/hc-templates';
import type { TratamientoSeleccionado } from '@/types/tratamiento';

interface TreatmentNodeProps {
  node: TreatmentNodeType;
  value: TratamientoSeleccionado[] | undefined;
  onChange: (value: TratamientoSeleccionado[]) => void;
}

export function TreatmentNode({ node, value, onChange }: TreatmentNodeProps) {
  const { data: tratamientos, isLoading, error } = useTratamientosProfesional();

  const multiSelect = node.ui?.multiSelect !== false;
  const showPrice = node.ui?.showPrice !== false;
  const showDescription = node.ui?.showDescription || false;

  // Filter treatments if treatmentIds are specified
  const filteredTratamientos = tratamientos?.filter((t) =>
    !node.treatmentIds?.length || node.treatmentIds.includes(t.id)
  ) || [];

  const selectedIds = (value || []).map((v) => v.tratamientoId);

  const handleToggle = (tratamiento: typeof filteredTratamientos[0]) => {
    const isSelected = selectedIds.includes(tratamiento.id);

    if (multiSelect) {
      if (isSelected) {
        onChange((value || []).filter((v) => v.tratamientoId !== tratamiento.id));
      } else {
        onChange([
          ...(value || []),
          {
            tratamientoId: tratamiento.id,
            nombre: tratamiento.nombre,
            precio: Number(tratamiento.precio),
            cantidad: 1,
            indicaciones: tratamiento.indicaciones || undefined,
            procedimiento: tratamiento.procedimiento || undefined,
          },
        ]);
      }
    } else {
      onChange([
        {
          tratamientoId: tratamiento.id,
          nombre: tratamiento.nombre,
          precio: Number(tratamiento.precio),
          cantidad: 1,
          indicaciones: tratamiento.indicaciones || undefined,
          procedimiento: tratamiento.procedimiento || undefined,
        },
      ]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 py-4">
        Error al cargar tratamientos
      </div>
    );
  }

  if (filteredTratamientos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No hay tratamientos disponibles. Configuralos desde el panel de configuración.
      </div>
    );
  }

  if (!multiSelect) {
    const selectedId = selectedIds[0] || '';
    return (
      <div className="space-y-3">
        <Label>{node.title}</Label>
        <RadioGroup
          value={selectedId}
          onValueChange={(id) => {
            const t = filteredTratamientos.find((tr) => tr.id === id);
            if (t) handleToggle(t);
          }}
          className="grid gap-3"
        >
          {filteredTratamientos.map((tratamiento) => (
            <Label
              key={tratamiento.id}
              htmlFor={`${node.key}-${tratamiento.id}`}
              className={cn(
                'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                selectedId === tratamiento.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <RadioGroupItem
                value={tratamiento.id}
                id={`${node.key}-${tratamiento.id}`}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">{tratamiento.nombre}</span>
                  {showPrice && (
                    <span className="font-medium text-emerald-600">
                      ${Number(tratamiento.precio).toLocaleString()}
                    </span>
                  )}
                </div>
                {showDescription && tratamiento.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tratamiento.descripcion}
                  </p>
                )}
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>{node.title}</Label>
      <div className="grid gap-3">
        {filteredTratamientos.map((tratamiento) => {
          const isSelected = selectedIds.includes(tratamiento.id);
          return (
            <div
              key={tratamiento.id}
              className={cn(
                'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-border hover:bg-muted/50'
              )}
              onClick={() => handleToggle(tratamiento)}
            >
              <Checkbox
                id={`${node.key}-${tratamiento.id}`}
                checked={isSelected}
                onCheckedChange={() => handleToggle(tratamiento)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">{tratamiento.nombre}</span>
                  {showPrice && (
                    <span className="font-medium text-emerald-600">
                      ${Number(tratamiento.precio).toLocaleString()}
                    </span>
                  )}
                </div>
                {showDescription && tratamiento.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tratamiento.descripcion}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} tratamiento(s) seleccionado(s)
        </p>
      )}
    </div>
  );
}
