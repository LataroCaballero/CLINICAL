"use client";

import { usePacientes } from "@/hooks/usePacientes";
import { pacienteColumns } from "./columns";
import { DataTable } from "@/components/data-table/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export function PacientesDataTable() {
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

  return (
    <DataTable
      columns={pacienteColumns}
      data={data || []}
      initialSorting={[{ id: "estado", desc: false }]}
    />
  );
}
