"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Check,
  Lock,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  ArrowUpDown,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  usePracticasPendientes,
  useMarcarPracticasPagadas,
  useCierreMensual,
} from "@/hooks/useFinanzas";
import { EstadoLiquidacion, LiquidacionesFilters } from "@/types/finanzas";
import { toast } from "sonner";

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

type SortField = "fecha" | "paciente" | "obraSocial" | "monto";

export default function LiquidacionesTab() {
  const [filters, setFilters] = useState<LiquidacionesFilters>({
    estadoLiquidacion: EstadoLiquidacion.PENDIENTE,
  });
  const [search, setSearch] = useState("");
  const [selectedPracticas, setSelectedPracticas] = useState<string[]>([]);
  const [mesActual] = useState(() => new Date().toISOString().slice(0, 7));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: practicas, isLoading, error, refetch } = usePracticasPendientes(filters);
  const { data: cierreMensual, isLoading: loadingCierre } = useCierreMensual(mesActual);
  const marcarPagadas = useMarcarPracticasPagadas();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filteredPracticas = (practicas || []).filter((p) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        p.paciente?.nombreCompleto?.toLowerCase().includes(searchLower) ||
        p.codigo?.includes(search) ||
        p.descripcion?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Ordenamiento
  const sortedPracticas = [...filteredPracticas].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "fecha":
        comparison = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        break;
      case "paciente":
        comparison = (a.paciente?.nombreCompleto || "").localeCompare(b.paciente?.nombreCompleto || "");
        break;
      case "obraSocial":
        comparison = (a.obraSocial?.nombre || "").localeCompare(b.obraSocial?.nombre || "");
        break;
      case "monto":
        comparison = a.monto - b.monto;
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  // Paginación
  const totalPages = Math.ceil(sortedPracticas.length / pageSize);
  const paginatedPracticas = sortedPracticas.slice((page - 1) * pageSize, page * pageSize);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPracticas(
        filteredPracticas
          .filter((p) => p.estadoLiquidacion === EstadoLiquidacion.PENDIENTE)
          .map((p) => p.id)
      );
    } else {
      setSelectedPracticas([]);
    }
  };

  const handleSelectPractica = (practicaId: string, checked: boolean) => {
    if (checked) {
      setSelectedPracticas([...selectedPracticas, practicaId]);
    } else {
      setSelectedPracticas(selectedPracticas.filter((id) => id !== practicaId));
    }
  };

  const handleMarcarPagadas = async () => {
    if (selectedPracticas.length === 0) {
      toast.error("Seleccioná al menos una práctica");
      return;
    }

    try {
      await marcarPagadas.mutateAsync(selectedPracticas);
      toast.success(`${selectedPracticas.length} prácticas marcadas como pagadas`);
      setSelectedPracticas([]);
      refetch();
    } catch (error) {
      toast.error("Error al marcar las prácticas como pagadas");
    }
  };

  const pendientesCount = sortedPracticas.filter(
    (p) => p.estadoLiquidacion === EstadoLiquidacion.PENDIENTE
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="liquidaciones" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="liquidaciones" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Liquidaciones Pendientes
          </TabsTrigger>
          <TabsTrigger value="cierre" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Cierre Mensual
          </TabsTrigger>
        </TabsList>

        {/* Tab Liquidaciones */}
        <TabsContent value="liquidaciones" className="space-y-4">
          {/* Filtros */}
          <Card className="border shadow-sm">
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por paciente, código o descripción..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={filters.estadoLiquidacion || "TODOS"}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      estadoLiquidacion:
                        v === "TODOS" ? undefined : (v as EstadoLiquidacion),
                    })
                  }
                >
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value={EstadoLiquidacion.PENDIENTE}>
                      Pendiente
                    </SelectItem>
                    <SelectItem value={EstadoLiquidacion.PAGADO}>Pagado</SelectItem>
                  </SelectContent>
                </Select>
                {selectedPracticas.length > 0 && (
                  <Button
                    onClick={handleMarcarPagadas}
                    disabled={marcarPagadas.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marcar como Pagadas ({selectedPracticas.length})
                  </Button>
                )}
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
                  <p className="text-gray-600">Error al cargar las prácticas</p>
                  <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                </div>
              ) : filteredPracticas.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay prácticas pendientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedPracticas.length === pendientesCount &&
                            pendientesCount > 0
                          }
                          onCheckedChange={handleSelectAll}
                          disabled={pendientesCount === 0}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("fecha")}
                      >
                        <div className="flex items-center gap-2">
                          Fecha
                          {sortField === "fecha" && <ArrowUpDown className="w-4 h-4" />}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("paciente")}
                      >
                        <div className="flex items-center gap-2">
                          Paciente
                          {sortField === "paciente" && <ArrowUpDown className="w-4 h-4" />}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("obraSocial")}
                      >
                        <div className="flex items-center gap-2">
                          Obra Social
                          {sortField === "obraSocial" && <ArrowUpDown className="w-4 h-4" />}
                        </div>
                      </TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 text-right"
                        onClick={() => handleSort("monto")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Monto
                          {sortField === "monto" && <ArrowUpDown className="w-4 h-4" />}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Coseguro</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPracticas.map((practica) => {
                      const isPagado =
                        practica.estadoLiquidacion === EstadoLiquidacion.PAGADO;
                      return (
                        <TableRow
                          key={practica.id}
                          className={isPagado ? "bg-gray-50 opacity-75" : ""}
                        >
                          <TableCell>
                            {isPagado ? (
                              <Lock className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Checkbox
                                checked={selectedPracticas.includes(practica.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectPractica(practica.id, checked as boolean)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {formatDate(practica.fecha)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {practica.paciente?.nombreCompleto}
                              </p>
                              <p className="text-xs text-gray-500">
                                DNI: {practica.paciente?.dni}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{practica.obraSocial?.nombre || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {practica.codigo}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {practica.descripcion}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatMoney(practica.monto)}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {practica.coseguro > 0
                              ? formatMoney(practica.coseguro)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {isPagado ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Pagado
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {!isLoading && !error && sortedPracticas.length > 0 && (
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={sortedPracticas.length}
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
          {!isLoading && sortedPracticas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {pendientesCount} pendiente{pendientesCount !== 1 && "s"} de{" "}
                {sortedPracticas.length} práctica{sortedPracticas.length !== 1 && "s"}
              </span>
              <span>
                Total pendiente:{" "}
                <span className="font-semibold text-gray-700">
                  {formatMoney(
                    sortedPracticas
                      .filter(
                        (p) => p.estadoLiquidacion === EstadoLiquidacion.PENDIENTE
                      )
                      .reduce((sum, p) => sum + p.monto, 0)
                  )}
                </span>
              </span>
            </div>
          )}
        </TabsContent>

        {/* Tab Cierre Mensual */}
        <TabsContent value="cierre" className="space-y-4">
          {loadingCierre ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : cierreMensual ? (
            <>
              {/* Resumen Global */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Obras Sociales</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatMoney(cierreMensual.totalObrasSociales)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Particulares</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatMoney(cierreMensual.totalParticulares)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Clínica</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatMoney(cierreMensual.totalClinica)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm bg-indigo-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-indigo-600">Total Global</p>
                    <p className="text-2xl font-semibold text-indigo-700">
                      {formatMoney(cierreMensual.totalGlobal)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detalle por Obra Social */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-5 h-5" />
                    Detalle por Obra Social - {cierreMensual.mes}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Obra Social</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Facturado</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cierreMensual.detalleObrasSociales.map((os) => (
                        <TableRow key={os.obraSocialId}>
                          <TableCell className="font-medium">{os.nombre}</TableCell>
                          <TableCell className="text-right">
                            {formatMoney(os.total)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatMoney(os.facturado)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              os.pendiente > 0 ? "text-amber-600" : "text-gray-400"
                            }`}
                          >
                            {os.pendiente > 0 ? formatMoney(os.pendiente) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {os.pendiente > 0 && (
                              <Button variant="outline" size="sm">
                                Emitir Comprobante
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay datos de cierre para este período</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
