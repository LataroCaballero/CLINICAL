"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import {
  useAutorizacionesPendientes,
  useAutorizarCodigos,
  useRechazarAutorizacion,
} from "@/hooks/useAutorizaciones";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profesionalId?: string | null;
}

export function AutorizacionesSheet({ open, onOpenChange, profesionalId }: Props) {
  const { data: autorizaciones, isLoading } = useAutorizacionesPendientes(
    open ? profesionalId : undefined
  );
  const autorizar = useAutorizarCodigos();
  const rechazar = useRechazarAutorizacion();
  const [notaRechazoPorId, setNotaRechazoPorId] = useState<Record<string, string>>({});

  const handleAutorizar = (id: string) => {
    autorizar.mutate({ id });
  };

  const handleRechazar = (id: string) => {
    rechazar.mutate({ id, nota: notaRechazoPorId[id] });
    setNotaRechazoPorId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold text-purple-700">
            <ShieldCheck className="h-4 w-4" />
            Autorizaciones pendientes
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Códigos que esperan autorización de obra social
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading && (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </>
          )}

          {!isLoading && (!autorizaciones || autorizaciones.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <ShieldCheck className="h-8 w-8 opacity-30" />
              <p className="text-sm">No hay autorizaciones pendientes</p>
            </div>
          )}

          {!isLoading &&
            autorizaciones &&
            autorizaciones.map((aut) => (
              <div
                key={aut.id}
                className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {aut.paciente.nombreCompleto}
                    </p>
                    <p className="text-xs text-purple-700 font-medium">{aut.obraSocial.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {aut.profesional.usuario.nombre} {aut.profesional.usuario.apellido}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(aut.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </div>

                {/* Códigos */}
                <ul className="space-y-1">
                  {aut.codigos.map((c, i) => (
                    <li key={i} className="text-xs text-gray-700 flex gap-2">
                      <span className="font-mono font-medium text-purple-700">{c.codigo}</span>
                      <span>{c.descripcion}</span>
                      {(c.monto ?? 0) > 0 && (
                        <span className="ml-auto text-gray-500">
                          ${c.monto?.toLocaleString("es-AR")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Nota rechazo */}
                <input
                  type="text"
                  placeholder="Nota de rechazo (opcional)"
                  value={notaRechazoPorId[aut.id] ?? ""}
                  onChange={(e) =>
                    setNotaRechazoPorId((prev) => ({ ...prev, [aut.id]: e.target.value }))
                  }
                  className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />

                {/* Acciones */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    onClick={() => handleAutorizar(aut.id)}
                    disabled={autorizar.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Autorizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 gap-1"
                    onClick={() => handleRechazar(aut.id)}
                    disabled={rechazar.isPending}
                  >
                    <XCircle className="h-3 w-3" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
