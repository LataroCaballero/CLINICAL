"use client";

import { useState } from "react";
import { ShieldCheck, Plus, X, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutorizacionesByPaciente, useCreateAutorizacion, useAutorizarCodigos, useRechazarAutorizacion } from "@/hooks/useAutorizaciones";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  pacienteId: string;
  obraSocialId?: string | null;
  profesionalId?: string | null;
}

const ESTADO_COLORS = {
  PENDIENTE: "bg-purple-100 text-purple-700 border-purple-300",
  AUTORIZADO: "bg-green-100 text-green-700 border-green-300",
  RECHAZADO: "bg-red-100 text-red-700 border-red-300",
};
const ESTADO_LABELS = { PENDIENTE: "Pendiente", AUTORIZADO: "Autorizado", RECHAZADO: "Rechazado" };

export function AutorizacionesPacienteSection({ pacienteId, obraSocialId, profesionalId }: Props) {
  const { data: autorizaciones = [], isLoading } = useAutorizacionesByPaciente(pacienteId);
  const createAut = useCreateAutorizacion();
  const autorizar = useAutorizarCodigos();
  const rechazar = useRechazarAutorizacion();

  const [showForm, setShowForm] = useState(false);
  const [codigos, setCodigos] = useState([{ codigo: "", descripcion: "" }]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const pendingCount = autorizaciones.filter((a) => a.estado === "PENDIENTE").length;

  const addCodigo = () => setCodigos((p) => [...p, { codigo: "", descripcion: "" }]);
  const removeCodigo = (i: number) => setCodigos((p) => p.filter((_, idx) => idx !== i));
  const updateCodigo = (i: number, field: "codigo" | "descripcion", val: string) =>
    setCodigos((p) => p.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));

  function handleSubmit() {
    if (!obraSocialId) return;
    const codigosValidos = codigos.filter((c) => c.codigo.trim() && c.descripcion.trim());
    if (!codigosValidos.length) return;
    createAut.mutate(
      { pacienteId, obraSocialId, codigos: codigosValidos, profesionalId: profesionalId ?? undefined },
      {
        onSuccess: () => {
          setShowForm(false);
          setCodigos([{ codigo: "", descripcion: "" }]);
        },
      }
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-semibold">Autorizaciones de obra social</h3>
          {pendingCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
              {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {obraSocialId && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-3 w-3" />
            Solicitar
          </Button>
        )}
      </div>

      {/* Aviso sin OS */}
      {!obraSocialId && (
        <p className="text-xs text-muted-foreground">
          Sin obra social asociada. Editá el perfil para agregar una.
        </p>
      )}

      {/* Form nueva autorización */}
      {showForm && obraSocialId && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
          <p className="text-xs font-medium text-purple-700">Nueva solicitud de autorización</p>
          {codigos.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
              <Input
                placeholder="Código"
                value={c.codigo}
                onChange={(e) => updateCodigo(i, "codigo", e.target.value)}
                className="text-xs h-8"
              />
              <Input
                placeholder="Descripción"
                value={c.descripcion}
                onChange={(e) => updateCodigo(i, "descripcion", e.target.value)}
                className="text-xs h-8"
              />
              {codigos.length > 1 && (
                <button type="button" onClick={() => removeCodigo(i)} className="text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={addCodigo}>
              <Plus className="h-3 w-3" /> Agregar código
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
              onClick={handleSubmit}
              disabled={createAut.isPending}
            >
              {createAut.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading && <div className="h-10 bg-muted animate-pulse rounded" />}

      {!isLoading && autorizaciones.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Sin autorizaciones registradas</p>
      )}

      {!isLoading && autorizaciones.map((aut) => (
        <div
          key={aut.id}
          className={`rounded-lg border p-3 space-y-2 ${ESTADO_COLORS[aut.estado] ?? "border-gray-200 bg-gray-50"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${ESTADO_COLORS[aut.estado]}`}>
                {ESTADO_LABELS[aut.estado]}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {aut.obraSocial.nombre}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(aut.createdAt), { addSuffix: true, locale: es })}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(expanded === aut.id ? null : aut.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                {expanded === aut.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Códigos expandidos */}
          {expanded === aut.id && (
            <ul className="space-y-1 pl-1">
              {aut.codigos.map((c, i) => (
                <li key={i} className="text-xs flex gap-2">
                  <span className="font-mono font-medium">{c.codigo}</span>
                  <span className="text-gray-600">{c.descripcion}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Acciones secretaria — solo pendientes */}
          {aut.estado === "PENDIENTE" && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 gap-1"
                onClick={() => autorizar.mutate({ id: aut.id })}
                disabled={autorizar.isPending}
              >
                <CheckCircle2 className="h-3 w-3" /> Autorizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 gap-1"
                onClick={() => rechazar.mutate({ id: aut.id })}
                disabled={rechazar.isPending}
              >
                <XCircle className="h-3 w-3" /> Rechazar
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
