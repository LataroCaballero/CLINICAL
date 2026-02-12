"use client";

import { useState } from "react";
import { usePacienteSuggest } from "@/hooks/usePacienteSuggest";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Loader2, X } from "lucide-react";

type Props = {
  onSelect: (paciente: any) => void;
  value?: string;
  avatarUrl?: string | null;
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
            />
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        className="p-0 overflow-y-auto max-h-60"
        align="start"
        sideOffset={4}
        style={{ width: "var(--radix-popper-anchor-width)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
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
                  DNI: {pac.dni} — Tel: {pac.telefono}
                </span>
              </div>
            </button>
          ))}
      </PopoverContent>
    </Popover>
  );
}
