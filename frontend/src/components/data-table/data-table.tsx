"use client";

import {
  ColumnDef,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";

import React, { useState, useEffect } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableColumnToggle } from "./data-table-column-toggle";
import PatientDrawer from "../../app/dashboard/pacientes/components/PatientDrawer";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  storageKey?: string;
  showColumnToggle?: boolean;
  showToolbar?: boolean;
  showPagination?: boolean;
  headerActions?: React.ReactNode;
}

function loadColumnVisibility(key: string): VisibilityState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`column-visibility-${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveColumnVisibility(key: string, state: VisibilityState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`column-visibility-${key}`, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  storageKey,
  showColumnToggle = false,
  showToolbar = true,
  showPagination = true,
  headerActions,
}: DataTableProps<TData, TValue>) {
  // 1) ESTADO LOCAL — copia editable de los datos originales
  const [tableData, setTableData] = useState<TData[]>(data);

  // 2) sincronizamos cuando cambian los datos desde el backend
  useEffect(() => {
    setTableData(data);
  }, [data]);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => (storageKey ? loadColumnVisibility(storageKey) ?? {} : {})
  );

  // Persist column visibility when it changes
  useEffect(() => {
    if (storageKey && Object.keys(columnVisibility).length > 0) {
      saveColumnVisibility(storageKey, columnVisibility);
    }
  }, [columnVisibility, storageKey]);

  const [globalFilter, setGlobalFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );

  const table = useReactTable({
    data: tableData, // ← usamos la copia local editable
    columns,
    state: {
      globalFilter,
      columnVisibility,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,

    globalFilterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const text = String(filterValue).toLowerCase();
      const paciente = row.original as any;

      return (
        paciente.nombreCompleto?.toLowerCase().includes(text) ||
        paciente.dni?.toLowerCase().includes(text) ||
        paciente.telefono?.toLowerCase().includes(text)
      );
    },

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),

    // 3) ESTA FUNCIÓN ES LA CLAVE: permite editar la tabla en tiempo real
    meta: {
      updateData: (rowIndex: number, columnId: string, value: any) => {
        setTableData((prev) =>
          prev.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                [columnId]: value,
              };
            }
            return row;
          })
        );
      },
    },
  });

  const handleRowClick = (paciente: any) => {
    setSelectedPatientId(paciente.id);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {(showToolbar || showColumnToggle || headerActions) && (
        <div className="flex items-center justify-between gap-4">
          {showToolbar ? (
            <DataTableToolbar table={table} />
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center gap-2">
            {showColumnToggle && <DataTableColumnToggle table={table} />}
            {headerActions}
          </div>
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const paciente = row.original as any;

                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/40 transition"
                    onClick={() => handleRowClick(paciente)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center h-24"
                >
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <DataTablePagination
          key={table.getState().pagination.pageIndex}
          table={table}
        />
      )}

      {/* Drawer controlado desde la tabla */}
      <PatientDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pacienteId={selectedPatientId}
      />
    </div>
  );
}
