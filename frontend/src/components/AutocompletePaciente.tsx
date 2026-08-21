"use client";

import { useState } from "react";
import { usePacienteSuggest } from "@/hooks/usePacienteSuggest";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Loader2, X, Plus } from "lucide-react";
import InlineCreatePaciente from "@/components/InlineCreatePaciente";
import { tieneTelefono } from "@/lib/telefono";

type Props = {
  onSelect: (paciente: any) => void;
  value?: string;
  avatarUrl?: string | null;
  onClear?: () => void;
  allowCreate?: boolean;
  /**
   * D-08/ALTA-06: profesional para el alta inline, provisto explícitamente por el
   * modal (mismo valor que usa para el turno). Diverge del profesional que filtra
   * la búsqueda (usePacienteSuggest resuelve el suyo internamente vía
   * useEffectiveProfessionalId) — divergencia conocida y aceptada, ver plan 02.
   */
  profesionalIdParaAlta?: string | null;
};

export default function AutocompletePaciente({
  onSelect,
  value,
  avatarUrl,
  onClear,
  allowCreate = false,
  profesionalIdParaAlta,
}: Props) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const { data = [], isFetching, isSuccess } = usePacienteSuggest(query);
  const { focusModeEnabled: fm } = useUIStore();

  // usePacienteSuggest no expone su valor debounceado; se llama useDebounce de
  // nuevo acá (mismo delay converge al mismo valor) para no ensanchar el
  // contrato del hook por un solo consumidor.
  const debouncedQuery = useDebounce(query, 300);

  // D-03: los cuatro términos evitan el falso negativo de la ventana pre-fetch
  // (data=[] e isFetching=false antes de que se haya buscado algo).
  const canOfferCreate =
    allowCreate &&
    !creating &&
    debouncedQuery.trim().length >= 3 &&
    !isFetching &&
    isSuccess;

  // ALTA-07: con allowCreate=false, creating y canOfferCreate son siempre false,
  // así que esta expresión colapsa exactamente a la original.
  const showDropdown =
    !value &&
    (creating || (query.length > 0 && (data.length > 0 || isFetching || canOfferCreate)));

  const getInitial = (name?: string) =>
    name ? name.charAt(0).toUpperCase() : "?";

  return (
    <Popover open={showDropdown} modal={false}>
      <PopoverAnchor asChild>
        <div className="w-full">
          {/* Paciente seleccionado */}
          {value && (
            <div className="flex items-center gap-2 w-full border rounded-md px-3 py-2 bg-indigo-50 shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={value}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                  {getInitial(value)}
                </div>
              )}
              <span className="flex-1 text-sm font-medium text-indigo-900">
                {value}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClear?.();
                  setQuery("");
                }}
                className="text-indigo-900/60 hover:text-indigo-900 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Input de búsqueda */}
          {!value && (
            <Input
              placeholder="Buscar paciente por nombre, DNI o teléfono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(fm && "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)] placeholder:text-slate-500")}
            />
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        className={cn("p-0 overflow-y-auto", creating ? "max-h-96" : "max-h-60")}
        align="start"
        sideOffset={4}
        style={{ width: "var(--radix-popper-anchor-width)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          // D-13: sólo cierra el mini-form. Con creating=false no hace nada.
          // Lo que evita que este Escape alcance al Dialog del turno es el
          // short-circuit isHighestLayer de Radix combinado con
          // preventDefault() (IN-03 de 68-REVIEW.md) — el descarte de Radix
          // escucha a nivel documento en fase de captura, así que
          // stopPropagation() no es la barrera real; se conserva igual por
          // no alterar comportamiento existente.
          // gap #2 de 68-VERIFICATION.md: mientras el alta está en vuelo
          // (createPending) tampoco se cierra el mini-form, en espejo del
          // disabled={isPending} que ya tiene el botón Cancelar.
          if (!creating) return;
          e.preventDefault();
          e.stopPropagation();
          if (createPending) return;
          setCreating(false);
        }}
        onPointerDownOutside={(e) => {
          // D-14: click afuera no cierra el mini-form. preventDefault() cancela el
          // dismiss de Radix; showDropdown ya incluye `creating ||` (Task 1), que
          // es lo que en definitiva mantiene el Popover abierto (el `open` es
          // state-driven, sin onOpenChange).
          if (creating) e.preventDefault();
        }}
      >
        {creating ? (
          <InlineCreatePaciente
            query={query}
            profesionalId={profesionalIdParaAlta}
            onCreated={(pac) => {
              onSelect(pac);
              setQuery("");
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
            onPendingChange={setCreatePending}
          />
        ) : (
          <>
            {isFetching && (
              <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
              </div>
            )}

            {!isFetching &&
              data.map((pac: any) => (
                <button
                  key={pac.id}
                  type="button"
                  onClick={() => {
                    onSelect(pac);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                >
                  {pac.fotoUrl ? (
                    <img
                      src={pac.fotoUrl}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold">
                      {getInitial(pac.nombreCompleto)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{pac.nombreCompleto}</span>
                    <span className="text-xs text-gray-500">
                      DNI: {pac.dni}
                      {tieneTelefono(pac.telefono) ? ` — Tel: ${pac.telefono}` : ""}
                    </span>
                  </div>
                </button>
              ))}

            {!isFetching && canOfferCreate && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 cursor-pointer",
                  data.length > 0 && "border-t"
                )}
              >
                <Plus className="h-4 w-4" />
                <span>{`Crear paciente: "${query}"`}</span>
              </button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
