'use client';

import { useHistoriaClinica } from '@/hooks/useHistoriaClinica';
import { FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  pacienteId: string;
}

type EntradaPrimeraVez = {
  tipo: 'primera_vez';
  diagnostico?: { zonas: string[]; subzonas: string[] };
  tratamientos?: Array<{ nombre: string; precio: number }>;
  comentario?: string;
};

type EntradaLibre = {
  tipo: string;
  texto?: string;
};

type ContenidoEntrada = EntradaPrimeraVez | EntradaLibre;

export function HistorialClinicoPanel({ pacienteId }: Props) {
  const { data: entradas, isLoading } = useHistoriaClinica(pacienteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Cargando historial...</span>
      </div>
    );
  }

  if (!entradas || entradas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
        <FileText className="w-8 h-8 opacity-40" />
        <p className="text-sm">Sin entradas previas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-full pr-1">
      {entradas.map((entrada: { id: string; fecha: string; contenido: ContenidoEntrada }) => {
        const contenido = (entrada.contenido ?? null) as ContenidoEntrada | null;
        const isPrimeraVez = contenido?.tipo === 'primera_vez';
        const pvContenido = isPrimeraVez ? (contenido as EntradaPrimeraVez) : null;

        return (
          <div
            key={entrada.id}
            className="border rounded-lg p-3 bg-white shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {contenido?.tipo === 'primera_vez'
                  ? 'Primera consulta'
                  : contenido?.tipo === 'pre_quirurgico'
                  ? 'Pre quirúrgico'
                  : contenido?.tipo === 'control'
                  ? 'Control'
                  : contenido?.tipo === 'practica'
                  ? 'Práctica'
                  : 'Libre'}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(entrada.fecha), "d MMM yyyy", { locale: es })}
              </span>
            </div>

            {isPrimeraVez && pvContenido ? (
              <div className="space-y-1.5">
                {pvContenido.diagnostico?.zonas && pvContenido.diagnostico.zonas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pvContenido.diagnostico.zonas.map((z) => (
                      <Badge key={z} variant="secondary" className="text-xs capitalize">
                        {z}
                      </Badge>
                    ))}
                    {pvContenido.diagnostico.subzonas?.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs capitalize">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
                {pvContenido.tratamientos && pvContenido.tratamientos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pvContenido.tratamientos.map((t, i) => (
                      <Badge key={i} className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                        {t.nombre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {(contenido as EntradaLibre | null)?.texto || '(sin contenido)'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
