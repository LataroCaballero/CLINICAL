"use client";

import { useState } from "react";
import { Table } from "@tanstack/react-table";
import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";
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
import NewPacienteModal from "@/app/dashboard/pacientes/components/NewPacienteModal";
import { toast } from "sonner";

interface DataTableToolbarProps {
  table: Table<any>;
  onNewPaciente?: () => void; // opcional, por si abrís un modal
}

export function DataTableToolbar({ table, onNewPaciente }: DataTableToolbarProps) {
  const { focusModeEnabled: fm } = useUIStore();
  const [selectedPaciente, setSelectedPaciente] = useState<{
    nombreCompleto: string;
    fotoUrl: string | null;
  } | null>(null);
  const [openNewPaciente, setOpenNewPaciente] = useState(false);

  const setEstadoFilter = (value: string | null) => {
    table.getColumn("estado")?.setFilterValue(value === "todos" ? "" : value);
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full justify-between items-center gap-4 py-2">

      {/* LEFT SIDE → SELECT ESTADO + AUTOCOMPLETE */}
      <div className="flex items-center gap-3 flex-1">

        {/* SELECT ESTADO (estilo compacto como la referencia) */}
        <Select onValueChange={setEstadoFilter}>
          <SelectTrigger className={cn("w-[180px] text-sm h-10 shadow-sm", fm ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)]" : "bg-white border border-gray-300")}>
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
        onClick={() => setOpen(true)}
        className={cn(fm && "bg-[var(--fc-bg-surface)] border border-[var(--fc-border)] text-[var(--fc-text-primary)] hover:bg-[var(--fc-bg-hover)]")}
        variant={fm ? "outline" : "default"}
      >
        Nuevo paciente
      </Button>

      <NewPacienteModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
