"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CalendarPlus, Phone } from "lucide-react";
import { useListaEspera } from "@/hooks/useListaEspera";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profesionalId: string | null;
  onDarTurno?: (pacienteId: string) => void;
}

function formatDiasEspera(fecha: string | null): string {
  if (!fecha) return "";
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  if (dias === 0) return "hoy";
  if (dias === 1) return "1 día";
  return `${dias} días`;
}

export function ListaEsperaSheet({ open, onOpenChange, profesionalId, onDarTurno }: Props) {
  const { data: pacientes, isLoading } = useListaEspera(open ? profesionalId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold text-amber-700">
            <Clock className="h-4 w-4" />
            Lista de espera
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pacientes que quieren adelantar turno
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading && (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </>
          )}

          {!isLoading && (!pacientes || pacientes.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm">No hay pacientes en lista de espera</p>
            </div>
          )}

          {!isLoading && pacientes && pacientes.length > 0 && (
            <>
              {pacientes.map((p) => {
                const procedimiento = p.tratamiento ?? p.lugarIntervencion;
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p.nombreCompleto}
                        </p>
                        {procedimiento && (
                          <p className="text-xs text-gray-500 truncate">{procedimiento}</p>
                        )}
                      </div>
                      <span className="text-xs text-amber-600 shrink-0 mt-0.5">
                        {formatDiasEspera(p.fechaListaEspera)}
                      </span>
                    </div>

                    {p.comentarioListaEspera && (
                      <p className="text-xs italic text-gray-500">
                        &ldquo;{p.comentarioListaEspera}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${p.telefono}`}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Phone className="h-3 w-3" />
                        {p.telefono}
                      </a>
                      {onDarTurno && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-100"
                          onClick={() => {
                            onOpenChange(false);
                            onDarTurno(p.id);
                          }}
                        >
                          <CalendarPlus className="h-3 w-3 mr-1" />
                          Dar turno
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
