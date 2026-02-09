"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosReporte, FiltrosValues } from "../../components/FiltrosReporte";
import { TablaReporte, ColumnDef, formatters, CurrencyCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import {
  useReporteVentasProductos,
  VentaPorProducto,
  VentaPorPaciente,
} from "@/hooks/useReportesOperativos";
import { Package, DollarSign, ShoppingCart, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReporteVentasPage() {
  const [filters, setFilters] = useState<FiltrosValues>({});
  const { data: reporte, isLoading } = useReporteVentasProductos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
  });

  const handleFilterChange = (newFilters: FiltrosValues) => {
    setFilters(newFilters);
  };

  const columnasProductos: ColumnDef<VentaPorProducto>[] = [
    { key: "nombre", header: "Producto" },
    { key: "cantidad", header: "Unidades", align: "center" },
    {
      key: "ingresos",
      header: "Ingresos",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
  ];

  const columnasPacientes: ColumnDef<VentaPorPaciente>[] = [
    { key: "nombreCompleto", header: "Paciente" },
    { key: "compras", header: "Compras", align: "center" },
    {
      key: "montoTotal",
      header: "Monto Total",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
    {
      key: "ultimaCompra",
      header: "Última Compra",
      render: (value: string) => formatters.date(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ventas de Productos</h1>
          <p className="text-gray-500">Análisis de ventas de productos del inventario</p>
        </div>
        <ExportButton
          tipoReporte="ventas-productos"
          filtros={{
            fechaDesde: filters.fechaDesde,
            fechaHasta: filters.fechaHasta,
          }}
          showPdf
        />
      </div>

      <FiltrosReporte
        onFilterChange={handleFilterChange}
        showAgrupacion={false}
        defaultPeriodo="30d"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Ventas</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : formatters.currency(reporte?.totalVentas ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unidades Vendidas</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : formatters.number(reporte?.cantidadProductos ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Productos Vendidos</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.ventasPorProducto?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Clientes</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.ventasPorPaciente?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de detalle */}
      <Tabs defaultValue="productos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="productos">Por Producto</TabsTrigger>
          <TabsTrigger value="pacientes">Por Paciente</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <TablaReporte
            titulo="Ventas por Producto"
            subtitulo="Productos más vendidos"
            columnas={columnasProductos}
            datos={reporte?.ventasPorProducto ?? []}
            loading={isLoading}
            emptyMessage="No hay ventas de productos en el período"
          />
        </TabsContent>

        <TabsContent value="pacientes">
          <TablaReporte
            titulo="Ventas por Paciente"
            subtitulo="Clientes con más compras"
            columnas={columnasPacientes}
            datos={reporte?.ventasPorPaciente ?? []}
            loading={isLoading}
            emptyMessage="No hay ventas registradas en el período"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
