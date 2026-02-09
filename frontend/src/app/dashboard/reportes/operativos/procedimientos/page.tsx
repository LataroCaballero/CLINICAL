"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosReporte, FiltrosValues } from "../../components/FiltrosReporte";
import { TablaReporte, ColumnDef, formatters, CurrencyCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import { useReporteProcedimientos, ProcedimientoRanking } from "@/hooks/useReportesOperativos";
import { Stethoscope, DollarSign, BarChart3 } from "lucide-react";

export default function ReporteProcedimientosPage() {
  const [filters, setFilters] = useState<FiltrosValues>({});
  const { data: reporte, isLoading } = useReporteProcedimientos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    limite: 50,
  });

  const handleFilterChange = (newFilters: FiltrosValues) => {
    setFilters(newFilters);
  };

  const columnasProcedimientos: ColumnDef<ProcedimientoRanking>[] = [
    {
      key: "ranking",
      header: "#",
      align: "center",
      render: (_: any, __: any, index?: number) => (
        <span className="font-medium text-gray-500">{(index ?? 0) + 1}</span>
      ),
    },
    { key: "codigo", header: "Código" },
    { key: "descripcion", header: "Descripción" },
    { key: "cantidad", header: "Cantidad", align: "center" },
    {
      key: "ingresoTotal",
      header: "Ingreso Total",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
  ];

  // Workaround: passing index to render function
  const datosConIndex = (reporte?.ranking ?? []).map((item, index) => ({
    ...item,
    _index: index,
  }));

  const columnasConIndex: ColumnDef<ProcedimientoRanking & { _index: number }>[] = [
    {
      key: "_index",
      header: "#",
      align: "center",
      render: (value: number) => (
        <span className="font-medium text-gray-500">{value + 1}</span>
      ),
    },
    { key: "codigo", header: "Código" },
    { key: "descripcion", header: "Descripción" },
    { key: "cantidad", header: "Cantidad", align: "center" },
    {
      key: "ingresoTotal",
      header: "Ingreso Total",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ranking de Procedimientos</h1>
          <p className="text-gray-500">Procedimientos más realizados y su facturación</p>
        </div>
        <ExportButton
          tipoReporte="procedimientos"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Stethoscope className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Procedimientos</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : formatters.number(reporte?.totalProcedimientos ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ingreso Total</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : formatters.currency(reporte?.ingresoTotal ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipos de Procedimiento</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.ranking?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla ranking */}
      <TablaReporte
        titulo="Ranking de Procedimientos"
        subtitulo="Ordenados por cantidad de realizaciones"
        columnas={columnasConIndex}
        datos={datosConIndex}
        loading={isLoading}
        emptyMessage="No hay procedimientos registrados en el período"
      />
    </div>
  );
}
