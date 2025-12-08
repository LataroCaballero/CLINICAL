"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Table } from "@tanstack/react-table";

interface DataTableToolbarProps {
  table: Table<any>;
}

export function DataTableToolbar({ table }: DataTableToolbarProps) {
  const globalFilter = table.getState().globalFilter;

  const setEstadoFilter = (value: string | null) => {
    table.getColumn("estado")?.setFilterValue(value === "todos" ? "" : value);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      {/* BUSCADOR */}
      <Input
        placeholder="Buscar paciente por nombre, DNI o teléfono..."
        value={globalFilter ?? ""}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        className="max-w-md"
      />

      {/* SELECT DE ESTADO */}
      <Select onValueChange={setEstadoFilter}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Filtrar por estado" />
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
    </div>
  );
}
