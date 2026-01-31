"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowUpDown,
  Eye,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useCuentasCorrientes } from "@/hooks/useFinanzas";
import { CuentasCorrientesFilters } from "@/types/finanzas";
import RegistrarPagoModal from "./RegistrarPagoModal";
import { TablePagination } from "@/components/ui/table-pagination";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface CuentasPorCobrarTabProps {
  initialEstado?: "AL_DIA" | "MOROSO" | "TODOS";
}

export default function CuentasPorCobrarTab({ initialEstado }: CuentasPorCobrarTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const estadoParam = searchParams.get("estado");

  const [filters, setFilters] = useState<CuentasCorrientesFilters>({
    search: "",
    estado: initialEstado || (estadoParam as "AL_DIA" | "MOROSO" | "TODOS") || "TODOS",
  });
  const [sortField, setSortField] = useState<"saldo" | "nombre" | "ultimoPago">("saldo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: cuentas, isLoading, error, refetch } = useCuentasCorrientes(filters);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleRegistrarPago = (pacienteId: string) => {
    setSelectedPacienteId(pacienteId);
    setPagoModalOpen(true);
  };

  const sortedCuentas = [...(cuentas || [])].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "saldo":
        comparison = a.saldoActual - b.saldoActual;
        break;
      case "nombre":
        comparison = a.paciente.nombreCompleto.localeCompare(b.paciente.nombreCompleto);
        break;
      case "ultimoPago":
        const dateA = a.ultimoPago ? new Date(a.ultimoPago).getTime() : 0;
        const dateB = b.ultimoPago ? new Date(b.ultimoPago).getTime() : 0;
        comparison = dateA - dateB;
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  const filteredCuentas = sortedCuentas.filter((cuenta) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        cuenta.paciente.nombreCompleto.toLowerCase().includes(searchLower) ||
        cuenta.paciente.dni.includes(filters.search);
      if (!matchesSearch) return false;
    }
    if (filters.estado && filters.estado !== "TODOS") {
      // Filtrar por estado basado en saldo, no en el campo estado del backend
      if (filters.estado === "AL_DIA" && cuenta.saldoActual > 0) return false;
      if (filters.estado === "MOROSO" && cuenta.saldoActual <= 0) return false;
    }
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(filteredCuentas.length / pageSize);
  const paginatedCuentas = filteredCuentas.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Select
              value={filters.estado}
              onValueChange={(v) =>
                setFilters({ ...filters, estado: v as "AL_DIA" | "MOROSO" | "TODOS" })
              }
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="AL_DIA">Sin deuda</SelectItem>
                <SelectItem value="MOROSO">Con deuda</SelectItem>
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
              <p className="text-gray-600">Error al cargar las cuentas corrientes</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : filteredCuentas.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron cuentas corrientes</p>
              {filters.search && (
                <p className="text-sm text-gray-400 mt-2">
                  Probá ajustar los filtros de búsqueda
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("nombre")}
                  >
                    <div className="flex items-center gap-2">
                      Paciente
                      {sortField === "nombre" && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Obra Social</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort("saldo")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Saldo Actual
                      {sortField === "saldo" && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Vencido</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("ultimoPago")}
                  >
                    <div className="flex items-center gap-2">
                      Último Pago
                      {sortField === "ultimoPago" && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCuentas.map((cuenta) => (
                  <TableRow
                    key={cuenta.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      router.push(`/dashboard/pacientes/${cuenta.pacienteId}/cuenta-corriente`)
                    }
                  >
                    <TableCell className="font-medium">
                      {cuenta.paciente.nombreCompleto}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {cuenta.paciente.dni}
                    </TableCell>
                    <TableCell>
                      {cuenta.paciente.obraSocial?.nombre || (
                        <span className="text-gray-400">Particular</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        cuenta.saldoActual > 0 ? "text-red-600" : "text-gray-600"
                      }`}
                    >
                      {formatMoney(cuenta.saldoActual)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        cuenta.saldoVencido > 0 ? "text-amber-600" : "text-gray-400"
                      }`}
                    >
                      {cuenta.saldoVencido > 0 ? formatMoney(cuenta.saldoVencido) : "-"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(cuenta.ultimoPago)}
                    </TableCell>
                    <TableCell>
                      {cuenta.saldoActual <= 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Al día
                        </Badge>
                      ) : cuenta.saldoVencido > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Moroso
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegistrarPago(cuenta.pacienteId);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Pago
                        </Button>
                        <Link
                          href={`/dashboard/pacientes/${cuenta.pacienteId}/cuenta-corriente`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && !error && filteredCuentas.length > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredCuentas.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Resumen */}
      {!isLoading && filteredCuentas.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Mostrando {filteredCuentas.length} cuenta{filteredCuentas.length !== 1 && "s"}
          </span>
          <span>
            Total por cobrar:{" "}
            <span className="font-semibold text-gray-700">
              {formatMoney(
                filteredCuentas.reduce((sum, c) => sum + c.saldoActual, 0)
              )}
            </span>
          </span>
        </div>
      )}

      {/* Modal para registrar pago */}
      <RegistrarPagoModal
        open={pagoModalOpen}
        onOpenChange={setPagoModalOpen}
        pacienteId={selectedPacienteId}
        onSuccess={() => {
          refetch();
          setPagoModalOpen(false);
        }}
      />
    </div>
  );
}
