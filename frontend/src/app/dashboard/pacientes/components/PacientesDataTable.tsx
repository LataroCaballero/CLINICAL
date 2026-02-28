"use client";

import { usePacientes } from "@/hooks/usePacientes";
import { createPacienteColumns } from "./columns";
import { DataTable } from "@/components/data-table/data-table";
import { Skeleton } from "@/components/ui/skeleton";

interface PacientesDataTableProps {
  unreadMap?: Record<string, number>;
}

export function PacientesDataTable({ unreadMap }: PacientesDataTableProps) {
  const { data, isLoading } = usePacientes();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const columns = createPacienteColumns(unreadMap);

  return (
    <DataTable
      columns={columns}
      data={data || []}
      initialSorting={[{ id: "estado", desc: false }]}
    />
  );
}
