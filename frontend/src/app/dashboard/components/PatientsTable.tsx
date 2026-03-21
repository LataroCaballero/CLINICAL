"use client";

import { useState, useMemo } from "react";
import { usePacientes } from "@/hooks/usePacientes";
import { pacienteColumns } from "../pacientes/components/columns";
import { DataTable } from "@/components/data-table/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import NewPacienteModal from "../pacientes/components/NewPacienteModal";

const ESTADO_ORDER: Record<string, number> = {
  QUIRURGICO: 1,
  PRESUPUESTO: 2,
  PRIMERA: 3,
  PRACTICA_CONSULTORIO: 4,
  ACTIVO: 5,
  ARCHIVADO: 6,
};

export default function PatientsTable() {
  const { data, isLoading } = usePacientes();

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a: any, b: any) => {
      const orderA = ESTADO_ORDER[a.estado] ?? 99;
      const orderB = ESTADO_ORDER[b.estado] ?? 99;
      return orderA - orderB;
    });
  }, [data]);
  const [openNewPaciente, setOpenNewPaciente] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Pacientes</h3>
      </div>
      <DataTable
        columns={pacienteColumns}
        data={sortedData}
        storageKey="dashboard-patients"
        showColumnToggle
        showToolbar={false}
        showPagination
        headerActions={
          <Button onClick={() => setOpenNewPaciente(true)}>
            Nuevo paciente
          </Button>
        }
      />

      <NewPacienteModal
        open={openNewPaciente}
        onClose={() => setOpenNewPaciente(false)}
      />
    </div>
  );
}
  