"use client";

import { useState } from "react";
import { Table } from "@tanstack/react-table";
import AutocompletePaciente from "@/components/AutocompletePaciente";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface DataTableToolbarProps {
  table: Table<any>;
  onNewPaciente?: () => void; // opcional, por si abrís un modal
}

export function DataTableToolbar({ table, onNewPaciente }: DataTableToolbarProps) {
  const [selectedPaciente, setSelectedPaciente] = useState<{
    nombreCompleto: string;
    fotoUrl: string | null;
  } | null>(null);

  const setEstadoFilter = (value: string | null) => {
    table.getColumn("estado")?.setFilterValue(value === "todos" ? "" : value);
  };

  return (
    <div className="flex w-full justify-between items-center gap-4 py-2">

      {/* LEFT SIDE → SELECT ESTADO + AUTOCOMPLETE */}
      <div className="flex items-center gap-3 flex-1">

        {/* SELECT ESTADO (estilo compacto como la referencia) */}
        <Select onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px] bg-white border border-gray-300 text-sm h-10 shadow-sm">
            <SelectValue placeholder="Estado del paciente" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ACTIVO">Activo</SelectItem>
            <SelectItem value="ARCHIVADO">Archivado</SelectItem>
            <SelectItem value="QUIRURGICO">Quirúrgico</SelectItem>
            <SelectItem value="PRESUPUESTO">Presupuesto</SelectItem>
            <SelectItem value="PRIMERA">Primera consulta</SelectItem>
            <SelectItem value="PRACTICA_CONSULTORIO">
              Práctica en consultorio
            </SelectItem>
          </SelectContent>
        </Select>

        {/* AUTOCOMPLETE */}
        <div className="max-w-md w-full">
          <AutocompletePaciente
            value={selectedPaciente?.nombreCompleto ?? ""}
            avatarUrl={selectedPaciente?.fotoUrl ?? null}
            onSelect={(pac) => {
              setSelectedPaciente({
                nombreCompleto: pac.nombreCompleto,
                fotoUrl: pac.fotoUrl,
              });

              table.setGlobalFilter(pac.nombreCompleto);
            }}
            onClear={() => {
              setSelectedPaciente(null);
              table.setGlobalFilter("");
            }}
          />
        </div>
      </div>

      {/* RIGHT SIDE → BOTÓN NUEVO PACIENTE */}
      <Button
        className="h-10 px-4 shadow-sm"
        onClick={onNewPaciente}
      >
        <Plus className="mr-2 h-4 w-4" />
        Nuevo paciente
      </Button>
    </div>
  );
}
