"use client";

import { Button } from "@/components/ui/button";
import type { Table } from "@tanstack/react-table";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const pagination = table.getState().pagination;
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount() || 1;

  return (
    <div className="flex items-center justify-between py-4">
      {/* IZQUIERDA: info */}
      <div className="text-sm text-muted-foreground">
        Página <span className="font-semibold">{pageIndex + 1}</span> de{" "}
        <span className="font-semibold">{pageCount}</span> —{" "}
        <span className="font-semibold">{totalRows}</span> pacientes
      </div>

      {/* DERECHA: botones */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
