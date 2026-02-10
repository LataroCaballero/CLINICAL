"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosReporte, FiltrosValues } from "../../components/FiltrosReporte";
import { TablaReporte, ColumnDef, formatters, CurrencyCell, PercentCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import {
  useReporteIngresos,
  useReporteIngresosPorProfesional,
  useReporteIngresosPorObraSocial,
  IngresosPorProfesional,
  IngresosPorObraSocial,
} from "@/hooks/useReportesFinancieros";
import { DollarSign, TrendingUp, Users, Building } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReporteIngresosPage() {
  const [filters, setFilters] = useState<FiltrosValues>({});

  const { data: ingresos, isLoading: loadingIngresos } = useReporteIngresos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    agrupacion: filters.agrupacion,
  });

  const { data: porProfesional, isLoading: loadingProfesional } = useReporteIngresosPorProfesional({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
  });

  const { data: porObraSocial, isLoading: loadingObraSocial } = useReporteIngresosPorObraSocial({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
  });

  const handleFilterChange = (newFilters: FiltrosValues) => {
    setFilters(newFilters);
  };

  const columnasProfesional: ColumnDef<IngresosPorProfesional>[] = [
    { key: "nombre", header: "Profesional" },
    { key: "especialidad", header: "Especialidad" },
    { key: "cantidadTurnos", header: "Turnos", align: "center" },
    {
      key: "ingresos",
      header: "Ingresos",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
    {
      key: "ticketPromedio",
      header: "Ticket Prom.",
      align: "right",
      render: (value: number) => formatters.currency(value),
    },
    {
      key: "porcentajeTotal",
      header: "% Total",
      align: "right",
      render: (value: number) => <PercentCell value={value} threshold={20} />,
    },
  ];

  const columnasObraSocial: ColumnDef<IngresosPorObraSocial>[] = [
    { key: "nombre", header: "Obra Social" },
    { key: "cantidadPacientes", header: "Pacientes", align: "center" },
    { key: "cantidadPracticas", header: "Prácticas", align: "center" },
    {
      key: "ingresos",
      header: "Ingresos",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
    {
      key: "porcentajeTotal",
      header: "% Total",
      align: "right",
      render: (value: number) => <PercentCell value={value} threshold={20} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reporte de Ingresos</h1>
          <p className="text-gray-500">Análisis detallado de ingresos y facturación</p>
        </div>
        <ExportButton
          tipoReporte="ingresos"
          filtros={{
            fechaDesde: filters.fechaDesde,
            fechaHasta: filters.fechaHasta,
          }}
          showPdf
        />
      </div>

      <FiltrosReporte
        onFilterChange={handleFilterChange}
        showAgrupacion={true}
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
                <p className="text-sm text-gray-500">Ingresos Totales</p>
                <p className="text-2xl font-semibold">
                  {loadingIngresos ? "-" : formatters.currency(ingresos?.totalIngresos ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ticket Promedio</p>
                <p className="text-2xl font-semibold">
                  {loadingIngresos ? "-" : formatters.currency(ingresos?.ticketPromedio ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Transacciones</p>
                <p className="text-2xl font-semibold">
                  {loadingIngresos ? "-" : ingresos?.cantidadTransacciones ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Building className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Obras Sociales</p>
                <p className="text-2xl font-semibold">
                  {loadingObraSocial ? "-" : porObraSocial?.porObraSocial?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de detalle */}
      <Tabs defaultValue="profesional" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profesional">Por Profesional</TabsTrigger>
          <TabsTrigger value="obrasocial">Por Obra Social</TabsTrigger>
        </TabsList>

        <TabsContent value="profesional">
          <TablaReporte
            titulo="Ingresos por Profesional"
            subtitulo="Desglose de facturación por profesional"
            columnas={columnasProfesional}
            datos={porProfesional?.porProfesional ?? []}
            loading={loadingProfesional}
            emptyMessage="No hay datos de ingresos por profesional"
          />
        </TabsContent>

        <TabsContent value="obrasocial">
          <TablaReporte
            titulo="Ingresos por Obra Social"
            subtitulo="Desglose de facturación por obra social"
            columnas={columnasObraSocial}
            datos={porObraSocial?.porObraSocial ?? []}
            loading={loadingObraSocial}
            emptyMessage="No hay datos de ingresos por obra social"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
