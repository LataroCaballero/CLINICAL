"use client";

import {
  ColumnDef,
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
import PatientDrawer from "../../app/dashboard/pacientes/components/PatientDrawer";

export function DataTable<TData, TValue>({
  columns,
  data,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}) {

  // 1) ESTADO LOCAL — copia editable de los datos originales
  const [tableData, setTableData] = useState<TData[]>(data);

  // 2) sincronizamos cuando cambian los datos desde el backend
  useEffect(() => {
    setTableData(data);
  }, [data]);

  const [globalFilter, setGlobalFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const table = useReactTable({
    data: tableData, // ← usamos la copia local editable
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,

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
      <DataTableToolbar table={table} />

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

      <DataTablePagination
        key={table.getState().pagination.pageIndex}
        table={table}
      />

      {/* Drawer controlado desde la tabla */}
      <PatientDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pacienteId={selectedPatientId}
      />
    </div>
  );
}
