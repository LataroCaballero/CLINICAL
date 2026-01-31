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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Plus,
  Eye,
  MoreVertical,
  Send,
  Check,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { usePresupuestosFinanzas, useUpdatePresupuestoEstado } from "@/hooks/useFinanzas";
import { EstadoPresupuesto, PresupuestosFilters } from "@/types/finanzas";
import { toast } from "sonner";
import PresupuestoDetailModal from "./components/PresupuestoDetailModal";
import { TablePagination } from "@/components/ui/table-pagination";

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
    month: "2-digit",
    year: "numeric",
  });
}

const ESTADO_BADGES: Record<
  EstadoPresupuesto,
  { label: string; className: string }
> = {
  [EstadoPresupuesto.BORRADOR]: {
    label: "Borrador",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  [EstadoPresupuesto.ENVIADO]: {
    label: "Enviado",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [EstadoPresupuesto.ACEPTADO]: {
    label: "Aceptado",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [EstadoPresupuesto.RECHAZADO]: {
    label: "Rechazado",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [EstadoPresupuesto.CANCELADO]: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export default function PresupuestosPage() {
  const [filters, setFilters] = useState<PresupuestosFilters>({});
  const [search, setSearch] = useState("");
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: presupuestos, isLoading, error, refetch } = usePresupuestosFinanzas(filters);
  const updateEstado = useUpdatePresupuestoEstado();

  const filteredPresupuestos = (presupuestos || []).filter((p) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        p.paciente?.nombreCompleto?.toLowerCase().includes(searchLower) ||
        p.paciente?.dni?.includes(search)
      );
    }
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(filteredPresupuestos.length / pageSize);
  const paginatedPresupuestos = filteredPresupuestos.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleAceptar = async (presupuestoId: string) => {
    try {
      await updateEstado.mutateAsync({
        presupuestoId,
        estado: EstadoPresupuesto.ACEPTADO,
      });
      toast.success("Presupuesto aceptado. Se creó el cargo en cuenta corriente.");
      refetch();
    } catch (error) {
      toast.error("Error al aceptar el presupuesto");
    }
  };

  const handleRechazar = async (presupuestoId: string) => {
    try {
      await updateEstado.mutateAsync({
        presupuestoId,
        estado: EstadoPresupuesto.RECHAZADO,
      });
      toast.success("Presupuesto rechazado");
      refetch();
    } catch (error) {
      toast.error("Error al rechazar el presupuesto");
    }
  };

  const handleVerDetalle = (presupuestoId: string) => {
    setSelectedPresupuesto(presupuestoId);
    setDetailModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Presupuestos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los presupuestos de tus pacientes
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por paciente..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={filters.estado || "TODOS"}
              onValueChange={(v) => {
                setFilters({
                  ...filters,
                  estado: v === "TODOS" ? undefined : (v as EstadoPresupuesto),
                });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value={EstadoPresupuesto.BORRADOR}>Borrador</SelectItem>
                <SelectItem value={EstadoPresupuesto.ENVIADO}>Enviado</SelectItem>
                <SelectItem value={EstadoPresupuesto.ACEPTADO}>Aceptado</SelectItem>
                <SelectItem value={EstadoPresupuesto.RECHAZADO}>Rechazado</SelectItem>
                <SelectItem value={EstadoPresupuesto.CANCELADO}>Cancelado</SelectItem>
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
              <p className="text-gray-600">Error al cargar los presupuestos</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : filteredPresupuestos.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron presupuestos</p>
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Crear primer presupuesto
              </Button>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPresupuestos.map((presupuesto) => (
                  <TableRow key={presupuesto.id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-500">
                      {formatDate(presupuesto.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{presupuesto.paciente?.nombreCompleto}</p>
                        <p className="text-xs text-gray-500">
                          {presupuesto.paciente?.obraSocial?.nombre || "Particular"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {presupuesto.items?.length || 0} items
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(presupuesto.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ESTADO_BADGES[presupuesto.estado].className}
                      >
                        {ESTADO_BADGES[presupuesto.estado].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalle(presupuesto.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleVerDetalle(presupuesto.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {presupuesto.estado === EstadoPresupuesto.BORRADOR && (
                              <DropdownMenuItem>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar al paciente
                              </DropdownMenuItem>
                            )}
                            {(presupuesto.estado === EstadoPresupuesto.BORRADOR ||
                              presupuesto.estado === EstadoPresupuesto.ENVIADO) && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleAceptar(presupuesto.id)}
                                  className="text-emerald-600"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRechazar(presupuesto.id)}
                                  className="text-red-600"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Rechazar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem>
                              <FileText className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPresupuestos.length > 0 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredPresupuestos.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Resumen */}
      {!isLoading && filteredPresupuestos.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Mostrando {filteredPresupuestos.length} presupuesto
            {filteredPresupuestos.length !== 1 && "s"}
          </span>
          <span>
            Total:{" "}
            <span className="font-semibold text-gray-700">
              {formatMoney(filteredPresupuestos.reduce((sum, p) => sum + p.total, 0))}
            </span>
          </span>
        </div>
      )}

      {/* Modal de detalle */}
      <PresupuestoDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        presupuestoId={selectedPresupuesto}
      />
    </div>
  );
}
