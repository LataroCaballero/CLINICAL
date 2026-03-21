'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CodigoPracticaEntradaDto } from '@/hooks/useCreateHistoriaClinicaEntry';

export interface AutorizacionFormState {
  obraSocialId: string;
  codigos: CodigoPracticaEntradaDto[];
}

interface Props {
  obraSocialId?: string | null;
  onChange: (state: AutorizacionFormState | null) => void;
}

export function AutorizacionCodigosForm({ obraSocialId, onChange }: Props) {
  const [activo, setActivo] = useState(false);
  const [codigos, setCodigos] = useState<CodigoPracticaEntradaDto[]>([]);

  const handleToggle = (checked: boolean) => {
    setActivo(checked);
    if (!checked) {
      onChange(null);
    } else if (obraSocialId && codigos.length > 0) {
      onChange({ obraSocialId, codigos });
    }
  };

  const addCodigo = () => {
    const next = [...codigos, { codigo: '', descripcion: '' }];
    setCodigos(next);
    if (obraSocialId) onChange({ obraSocialId, codigos: next });
  };

  const removeCodigo = (idx: number) => {
    const next = codigos.filter((_, i) => i !== idx);
    setCodigos(next);
    if (obraSocialId && next.length > 0) onChange({ obraSocialId, codigos: next });
    else if (next.length === 0) onChange(null);
  };

  const updateCodigo = (idx: number, field: keyof CodigoPracticaEntradaDto, value: string | number) => {
    const next = codigos.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    setCodigos(next);
    if (obraSocialId && next.length > 0) onChange({ obraSocialId, codigos: next });
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm font-medium text-gray-700">Solicitar autorización de obra social</span>
      </label>

      {activo && (
        <div className="pl-6 space-y-3">
          {!obraSocialId && (
            <p className="text-xs text-amber-600">
              El paciente no tiene obra social asociada. Guardá primero la OS en su perfil.
            </p>
          )}

          {obraSocialId && (
            <>
              {codigos.map((c, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                  <Input
                    placeholder="Código"
                    value={c.codigo}
                    onChange={(e) => updateCodigo(idx, 'codigo', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Descripción"
                    value={c.descripcion}
                    onChange={(e) => updateCodigo(idx, 'descripcion', e.target.value)}
                    className="text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeCodigo(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={addCodigo}
              >
                <Plus className="h-3 w-3" />
                Agregar código
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
