"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  FileText,
  Wallet,
  CreditCard,
  Banknote,
  Plus,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { usePagos } from "@/hooks/useFinanzas";
import { MedioPago, PagosFilters } from "@/types/finanzas";
import RegistrarPagoModal from "../cuentas-corrientes/components/RegistrarPagoModal";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const MEDIO_PAGO_ICONS: Record<MedioPago, React.ReactNode> = {
  [MedioPago.EFECTIVO]: <Banknote className="w-4 h-4 text-emerald-500" />,
  [MedioPago.TRANSFERENCIA]: <Wallet className="w-4 h-4 text-blue-500" />,
  [MedioPago.TARJETA_DEBITO]: <CreditCard className="w-4 h-4 text-purple-500" />,
  [MedioPago.TARJETA_CREDITO]: <CreditCard className="w-4 h-4 text-indigo-500" />,
  [MedioPago.MERCADO_PAGO]: <Wallet className="w-4 h-4 text-sky-500" />,
  [MedioPago.OTRO]: <Wallet className="w-4 h-4 text-gray-500" />,
};

const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  [MedioPago.EFECTIVO]: "Efectivo",
  [MedioPago.TRANSFERENCIA]: "Transferencia",
  [MedioPago.TARJETA_DEBITO]: "Tarjeta Débito",
  [MedioPago.TARJETA_CREDITO]: "Tarjeta Crédito",
  [MedioPago.MERCADO_PAGO]: "Mercado Pago",
  [MedioPago.OTRO]: "Otro",
};

function exportToCSV(data: any[], filename: string) {
  const headers = ["Fecha", "Paciente", "DNI", "Medio", "Referencia", "Monto"];
  const rows = data.map((p) => [
    formatDate(p.fecha),
    p.paciente.nombreCompleto,
    p.paciente.dni,
    MEDIO_PAGO_LABELS[p.medioPago as MedioPago] || p.medioPago,
    p.referencia || "",
    p.monto.toString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}

export default function PagosPage() {
  const [filters, setFilters] = useState<PagosFilters>({});
  const [search, setSearch] = useState("");
  const [pagoModalOpen, setPagoModalOpen] = useState(false);

  const { data: pagos, isLoading, error, refetch } = usePagos(filters);

  const filteredPagos = (pagos || []).filter((p) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        p.paciente?.nombreCompleto?.toLowerCase().includes(searchLower) ||
        p.paciente?.dni?.includes(search) ||
        p.referencia?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const totalPagos = filteredPagos.reduce((sum, p) => sum + p.monto, 0);

  const handleExport = () => {
    exportToCSV(filteredPagos, `pagos_${new Date().toISOString().split("T")[0]}`);
  };

  // Agrupar por día para reporte de ingresos diarios
  const pagosPorDia = filteredPagos.reduce((acc, p) => {
    const fecha = p.fecha.split("T")[0];
    if (!acc[fecha]) {
      acc[fecha] = { fecha, total: 0, cantidad: 0 };
    }
    acc[fecha].total += p.monto;
    acc[fecha].cantidad += 1;
    return acc;
  }, {} as Record<string, { fecha: string; total: number; cantidad: number }>);

  const ingresosHoy = pagosPorDia[new Date().toISOString().split("T")[0]]?.total || 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Pagos e Ingresos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona y visualiza todos los pagos recibidos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setPagoModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Ingresos Hoy</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {formatMoney(ingresosHoy)}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Filtrado</p>
            <p className="text-2xl font-semibold text-gray-800">
              {formatMoney(totalPagos)}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Cantidad</p>
            <p className="text-2xl font-semibold text-gray-800">
              {filteredPagos.length} pagos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por paciente, DNI o referencia..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                className="w-[150px]"
                value={filters.fechaDesde || ""}
                onChange={(e) =>
                  setFilters({ ...filters, fechaDesde: e.target.value || undefined })
                }
                placeholder="Desde"
              />
              <Input
                type="date"
                className="w-[150px]"
                value={filters.fechaHasta || ""}
                onChange={(e) =>
                  setFilters({ ...filters, fechaHasta: e.target.value || undefined })
                }
                placeholder="Hasta"
              />
            </div>
            <Select
              value={filters.medioPago || "TODOS"}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  medioPago: v === "TODOS" ? undefined : (v as MedioPago),
                })
              }
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Medio de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {Object.entries(MEDIO_PAGO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">Error al cargar los pagos</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : filteredPagos.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron pagos</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setPagoModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar primer pago
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Medio de Pago</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPagos.map((pago) => (
                  <TableRow key={pago.id} className={pago.anulado ? "opacity-50" : ""}>
                    <TableCell className="text-gray-500">
                      {formatDate(pago.fecha)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/pacientes/${pago.paciente.id}/cuenta-corriente`}
                        className="hover:underline"
                      >
                        <p className="font-medium">{pago.paciente.nombreCompleto}</p>
                        <p className="text-xs text-gray-500">
                          DNI: {pago.paciente.dni}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {MEDIO_PAGO_ICONS[pago.medioPago]}
                        <span>{MEDIO_PAGO_LABELS[pago.medioPago]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {pago.referencia || "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatMoney(pago.monto)}
                    </TableCell>
                    <TableCell>
                      {pago.anulado ? (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-500 border-gray-200"
                        >
                          Anulado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Confirmado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reporte de Ingresos Diarios */}
      {!isLoading && Object.keys(pagosPorDia).length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Ingresos por Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(pagosPorDia)
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .slice(0, 7)
                  .map((dia) => (
                    <TableRow key={dia.fecha}>
                      <TableCell>{formatDate(dia.fecha)}</TableCell>
                      <TableCell className="text-center">{dia.cantidad}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(dia.total)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal de Pago */}
      <RegistrarPagoModal
        open={pagoModalOpen}
        onOpenChange={setPagoModalOpen}
        pacienteId={null}
        onSuccess={() => {
          refetch();
          setPagoModalOpen(false);
        }}
      />
    </div>
  );
}
