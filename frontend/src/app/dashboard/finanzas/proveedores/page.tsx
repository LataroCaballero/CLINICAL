"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search,
  ArrowUpDown,
  Eye,
  DollarSign,
  AlertTriangle,
  Plus,
  Clock,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  useCuentasCorrientesProveedores,
  useResumenDeudasProveedores,
  useCuotasVencidas,
  useCuotasProximas,
} from "@/hooks/useCuentasCorrientesProveedores";
import RegistrarPagoModal from "./components/RegistrarPagoModal";
import CuotasTable from "./components/CuotasTable";
import ResumenDeudasCard from "./components/ResumenDeudasCard";

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

export default function ProveedoresFinanzasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [soloConDeuda, setSoloConDeuda] = useState(false);
  const [sortField, setSortField] = useState<"saldo" | "nombre">("saldo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string | null>(
    null
  );
  const [selectedProveedorNombre, setSelectedProveedorNombre] = useState<
    string | null
  >(null);

  const {
    data: cuentas,
    isLoading,
    error,
    refetch,
  } = useCuentasCorrientesProveedores({ soloConDeuda });
  const { data: resumen, isLoading: isLoadingResumen } =
    useResumenDeudasProveedores();
  const { data: cuotasVencidas, isLoading: isLoadingVencidas } =
    useCuotasVencidas();
  const { data: cuotasProximas, isLoading: isLoadingProximas } =
    useCuotasProximas(30);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleRegistrarPago = (proveedorId: string, proveedorNombre: string) => {
    setSelectedProveedorId(proveedorId);
    setSelectedProveedorNombre(proveedorNombre);
    setPagoModalOpen(true);
  };

  const sortedCuentas = [...(cuentas || [])].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "saldo":
        comparison = a.saldoActual - b.saldoActual;
        break;
      case "nombre":
        comparison = (a.proveedor?.nombre || "").localeCompare(
          b.proveedor?.nombre || ""
        );
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  const filteredCuentas = sortedCuentas.filter((cuenta) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        cuenta.proveedor?.nombre?.toLowerCase().includes(searchLower) ||
        cuenta.proveedor?.cuit?.includes(searchTerm);
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Cuentas Corrientes Proveedores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las deudas y pagos a proveedores
          </p>
        </div>
      </div>

      {/* Resumen Cards */}
      <ResumenDeudasCard resumen={resumen} isLoading={isLoadingResumen} />

      {/* Tabs */}
      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList>
          <TabsTrigger value="cuentas">Cuentas Corrientes</TabsTrigger>
          <TabsTrigger value="vencidas" className="flex items-center gap-2">
            Cuotas Vencidas
            {cuotasVencidas && cuotasVencidas.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {cuotasVencidas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="proximas">Próximos Vencimientos</TabsTrigger>
        </TabsList>

        {/* Tab: Cuentas Corrientes */}
        <TabsContent value="cuentas" className="mt-4">
          {/* Filtros */}
          <Card className="border shadow-sm mb-4">
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre o CUIT..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant={soloConDeuda ? "default" : "outline"}
                  onClick={() => setSoloConDeuda(!soloConDeuda)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Solo con deuda
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Cuentas */}
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
                  <p className="text-gray-600">
                    Error al cargar las cuentas corrientes
                  </p>
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
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No se encontraron cuentas corrientes de proveedores
                  </p>
                  {searchTerm && (
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
                          Proveedor
                          {sortField === "nombre" && (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>CUIT</TableHead>
                      <TableHead>Contacto</TableHead>
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
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead>Último Movimiento</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCuentas.map((cuenta) => (
                      <TableRow key={cuenta.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {cuenta.proveedor?.nombre}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {cuenta.proveedor?.cuit || "-"}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          <div className="flex flex-col">
                            {cuenta.proveedor?.telefono && (
                              <span className="text-xs">
                                {cuenta.proveedor.telefono}
                              </span>
                            )}
                            {cuenta.proveedor?.email && (
                              <span className="text-xs text-gray-400">
                                {cuenta.proveedor.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            cuenta.saldoActual > 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {formatMoney(cuenta.saldoActual)}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {formatMoney(cuenta.totalPagadoHistorico)}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {formatDate(cuenta.ultimoMovimiento ?? null)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRegistrarPago(
                                  cuenta.proveedorId,
                                  cuenta.proveedor?.nombre || ""
                                )
                              }
                              disabled={cuenta.saldoActual <= 0}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Pago
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Navigate to detail - could implement later
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Resumen */}
          {!isLoading && filteredCuentas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
              <span>
                Mostrando {filteredCuentas.length} cuenta
                {filteredCuentas.length !== 1 && "s"}
              </span>
              <span>
                Total por pagar:{" "}
                <span className="font-semibold text-gray-700">
                  {formatMoney(
                    filteredCuentas.reduce((sum, c) => sum + c.saldoActual, 0)
                  )}
                </span>
              </span>
            </div>
          )}
        </TabsContent>

        {/* Tab: Cuotas Vencidas */}
        <TabsContent value="vencidas" className="mt-4">
          <CuotasTable
            cuotas={cuotasVencidas || []}
            isLoading={isLoadingVencidas}
            tipo="vencidas"
            onPagarCuota={refetch}
          />
        </TabsContent>

        {/* Tab: Próximos Vencimientos */}
        <TabsContent value="proximas" className="mt-4">
          <CuotasTable
            cuotas={cuotasProximas || []}
            isLoading={isLoadingProximas}
            tipo="proximas"
            onPagarCuota={refetch}
          />
        </TabsContent>
      </Tabs>

      {/* Modal para registrar pago */}
      <RegistrarPagoModal
        open={pagoModalOpen}
        onOpenChange={setPagoModalOpen}
        proveedorId={selectedProveedorId}
        proveedorNombre={selectedProveedorNombre}
        onSuccess={() => {
          refetch();
          setPagoModalOpen(false);
        }}
      />
    </div>
  );
}
