"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  ButtonGroup,
} from "@/components/ui/button-group"; // IMPORTANTE
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const initialPageSize = table.getState().pagination.pageSize || 10;
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);

  const pagination = table.getState().pagination;
  const pageIndex = pagination.pageIndex;

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = Math.ceil(totalRows / rowsPerPage) || 1;

  return (
    <div className="flex items-center justify-between py-4">
      {/* IZQUIERDA */}
      <div className="flex items-center gap-4">
        {/* SELECTOR ROWS PER PAGE */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página</span>

          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              const newSize = Number(value);
              setRowsPerPage(newSize);
              table.setPageSize(newSize);
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[90px] h-9">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="40">40</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* INFO DE PÁGINA */}
        <div className="text-sm text-muted-foreground">
          Página <span className="font-semibold">{pageIndex + 1}</span> de{" "}
          <span className="font-semibold">{pageCount}</span> —{" "}
          <span className="font-semibold">{totalRows}</span> pacientes
        </div>
      </div>

      {/* DERECHA — BUTTON GROUP */}
      <ButtonGroup variant="outline" className="bg-white dark:bg-background border border-input rounded-md">
        {/* Primera página */}
        <Button
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={pageIndex === 0}
          className="bg-white hover:bg-gray-100 dark:bg-background"
        >
          <ChevronsLeft className="h-4 w-4 text-black" />
        </Button>

        {/* Página anterior */}
        <Button
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="bg-white hover:bg-gray-100 dark:bg-background"
        >
          <ChevronLeft className="h-4 w-4 text-black" />
        </Button>

        {/* Página siguiente */}
        <Button
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="bg-white hover:bg-gray-100 dark:bg-background"
        >
          <ChevronRight className="h-4 w-4 text-black" />
        </Button>

        {/* Última página */}
        <Button
          size="sm"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={pageIndex === pageCount - 1}
          className="bg-white hover:bg-gray-100 dark:bg-background"
        >
          <ChevronsRight className="h-4 w-4 text-black" />
        </Button>
      </ButtonGroup>
    </div>
  );
}
