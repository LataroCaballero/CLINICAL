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
import NewPacienteModal from "@/app/dashboard/pacientes/components/NewPacienteModal";
import { useCreatePaciente } from "@/hooks/useCreatePaciente";
import { useProfesionales } from "@/hooks/useProfesionales";
import { useObrasSociales } from "@/hooks/useObrasSociales";
import { toast } from "sonner";

interface DataTableToolbarProps {
  table: Table<any>;
  onNewPaciente?: () => void; // opcional, por si abrís un modal
}

export function DataTableToolbar({ table, onNewPaciente }: DataTableToolbarProps) {
  const [selectedPaciente, setSelectedPaciente] = useState<{
    nombreCompleto: string;
    fotoUrl: string | null;
  } | null>(null);
  const [openNewPaciente, setOpenNewPaciente] = useState(false);

  const { data: obrasSocialesData } = useObrasSociales();
  const { data: profesionalesData } = useProfesionales();

  console.log("OBRAS SOCIALES:", obrasSocialesData);
  console.log("PROFESIONALES:", profesionalesData);

  const createPacienteMutation = useCreatePaciente();

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
      <Button onClick={() => setOpen(true)}>
        Nuevo paciente
      </Button>

      <NewPacienteModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(payload, setError, setGlobalError) => {
          // Limpiamos cualquier error global anterior
          setGlobalError("");

          createPacienteMutation.mutate(payload, {
            onError: (error: any) => {
              const status = error?.response?.status || error?.statusCode;
              const message = error?.response?.data?.message || error?.message;

              if (status === 409 || message?.includes("DNI")) {
                setGlobalError("El DNI ingresado ya está registrado.");
                return;
              }

              setGlobalError(message || "Ocurrió un error al crear el paciente.");
            },

            onSuccess: () => {
              toast.success("Paciente creado correctamente");
              setOpen(false);
            },
          });
        }}

        obrasSociales={obrasSocialesData}
        profesionales={profesionalesData}
      />
    </div>
  );
}
