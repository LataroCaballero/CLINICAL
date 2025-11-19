"use client";

import { useState, useEffect, useRef } from "react";
import { usePacienteSuggest } from "@/hooks/usePacienteSuggest";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onSelect: (paciente: any) => void;
  value?: string; // nombre del paciente
  avatarUrl?: string | null; // foto del paciente
  onClear?: () => void;
};

export default function AutocompletePaciente({
  onSelect,
  value,
  avatarUrl,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const { data = [], isFetching } = usePacienteSuggest(query);

  const showDropdown =
    !value && query.length > 0 && (data.length > 0 || isFetching);

  const getInitial = (name?: string) =>
    name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="relative w-full">
      {/* ========================== */}
      {/*   MODO “PACIENTE SELECCIONADO” */}
      {/* ========================== */}
      {value && (
        <div
          className="
            flex items-center gap-2
            w-full border rounded-md
            px-3 py-2 bg-indigo-50
            shadow-sm
          "
        >
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={value}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="
                h-7 w-7 rounded-full 
                bg-indigo-500 text-white 
                flex items-center justify-center 
                text-sm font-semibold
              "
            >
              {getInitial(value)}
            </div>
          )}

          {/* Nombre */}
          <span className="flex-1 text-sm font-medium text-indigo-900">
            {value}
          </span>

          {/* Botón limpiar */}
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

      {/* ========================== */}
      {/*   MODO “SIN SELECCIÓN” */}
      {/* ========================== */}
      {!value && (
        <Input
          placeholder="Buscar paciente por nombre, DNI o teléfono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {/* ========================== */}
      {/*   DROPDOWN DE SUGERENCIAS */}
      {/* ========================== */}
      {showDropdown && (
        <div
          className="
          absolute left-0 right-0 mt-1
          rounded-md border bg-white shadow-lg
          z-50 max-h-60 overflow-y-auto
        "
        >
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
                className="
                  w-full flex items-center gap-3
                  px-3 py-2 text-left 
                  hover:bg-gray-100 cursor-pointer
                "
              >
                {/* Avatar mini */}
                {pac.fotoUrl ? (
                  <img
                    src={pac.fotoUrl}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="
                      h-7 w-7 rounded-full
                      bg-gray-200 text-gray-600
                      flex items-center justify-center
                      text-sm font-semibold
                    "
                  >
                    {getInitial(pac.nombreCompleto)}
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="font-medium">{pac.nombreCompleto}</span>
                  <span className="text-xs text-gray-500">
                    DNI: {pac.dni} — Tel: {pac.telefono}
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
