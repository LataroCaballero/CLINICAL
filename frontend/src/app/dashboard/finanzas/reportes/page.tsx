"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ReportesPage() {
  const [filtros, setFiltros] = useState({
    periodo: "Noviembre 2025",
    obraSocial: "todas",
    estado: "todos",
  });

  const reportes = [
    {
      id: 1,
      periodo: "Octubre 2025",
      entidad: "OSDE",
      monto: 850000,
      estado: "Pagado",
      fechaEmision: new Date(2025, 9, 30),
    },
    {
      id: 2,
      periodo: "Septiembre 2025",
      entidad: "Swiss Medical",
      monto: 620000,
      estado: "Pendiente",
      fechaEmision: new Date(2025, 8, 29),
    },
    {
      id: 3,
      periodo: "Agosto 2025",
      entidad: "Particulares",
      monto: 320000,
      estado: "Pagado",
      fechaEmision: new Date(2025, 7, 31),
    },
  ];

  const filtrados = reportes.filter((r) => {
    const matchObra =
      filtros.obraSocial === "todas" ||
      r.entidad.toLowerCase() === filtros.obraSocial.toLowerCase();
    const matchEstado =
      filtros.estado === "todos" ||
      r.estado.toLowerCase() === filtros.estado.toLowerCase();
    return matchObra && matchEstado;
  });

  const totalFacturado = filtrados.reduce((acc, r) => acc + r.monto, 0);

  const exportarCSV = () => {
    const encabezado = ["Periodo", "Entidad", "Monto", "Estado", "Fecha emisión"];
    const filas = filtrados.map((r) => [
      r.periodo,
      r.entidad,
      `$${r.monto.toLocaleString("es-AR")}`,
      r.estado,
      format(r.fechaEmision, "dd/MM/yyyy"),
    ]);
    const csv = [encabezado, ...filas].map((f) => f.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_facturacion.csv";
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Reportes históricos</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-600">Período</label>
            <Input
              value={filtros.periodo}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, periodo: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Obra Social</label>
            <Select
              value={filtros.obraSocial}
              onValueChange={(v) => setFiltros((p) => ({ ...p, obraSocial: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar obra social" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="osde">OSDE</SelectItem>
                <SelectItem value="swiss medical">Swiss Medical</SelectItem>
                <SelectItem value="particulares">Particulares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Estado</label>
            <Select
              value={filtros.estado}
              onValueChange={(v) => setFiltros((p) => ({ ...p, estado: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-end">
            <Button onClick={exportarCSV} className="flex gap-2 bg-indigo-600 text-white">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Entidad / Obra social</TableHead>
                <TableHead>Monto facturado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de emisión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.periodo}</TableCell>
                  <TableCell>{r.entidad}</TableCell>
                  <TableCell>${r.monto.toLocaleString("es-AR")}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.estado === "Pagado"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.estado}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(r.fechaEmision, "dd 'de' MMMM yyyy", { locale: es })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtrados.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No hay registros que coincidan con los filtros seleccionados.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-6 items-center mt-2 pr-6">
        <div className="text-sm text-gray-600">
          <strong>Total facturado:</strong>{" "}
          <span className="text-green-700 font-medium">
            ${totalFacturado.toLocaleString("es-AR")}
          </span>
        </div>
        <Button variant="outline" className="flex gap-2">
          <FileText className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>
    </div>
  );
}
