"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltrosReporte, FiltrosValues } from "../../components/FiltrosReporte";
import { TablaReporte, ColumnDef, formatters, CurrencyCell, PercentCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import { useReporteTurnos } from "@/hooks/useReportesOperativos";
import { ReporteTurnos, TurnosPorPeriodo } from "@/types/reportes";
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

export default function ReporteTurnosPage() {
  const [filters, setFilters] = useState<FiltrosValues>({});
  const { data: reporte, isLoading } = useReporteTurnos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    agrupacion: filters.agrupacion,
  });

  const handleFilterChange = (newFilters: FiltrosValues) => {
    setFilters(newFilters);
  };

  const columnasPorPeriodo: ColumnDef<TurnosPorPeriodo>[] = [
    { key: "periodo", header: "Período" },
    { key: "total", header: "Total", align: "right" },
    { key: "completados", header: "Completados", align: "right" },
    { key: "cancelados", header: "Cancelados", align: "right" },
    { key: "ausentismos", header: "Ausentismos", align: "right" },
    {
      key: "tasaAsistencia",
      header: "Tasa Asistencia",
      align: "right",
      render: (value: number) => <PercentCell value={value} threshold={70} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reporte de Turnos</h1>
          <p className="text-gray-500">Análisis detallado de turnos y asistencia</p>
        </div>
        <ExportButton
          tipoReporte="turnos"
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
              <div className="p-3 bg-blue-50 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Turnos</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.totalTurnos ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completados</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.completados ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cancelados</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.cancelados ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tasa Asistencia</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : `${(reporte?.tasaAsistencia ?? 0).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla por período */}
      <TablaReporte
        titulo="Detalle por Período"
        subtitulo={`Agrupado por ${filters.agrupacion || "día"}`}
        columnas={columnasPorPeriodo}
        datos={reporte?.porPeriodo ?? []}
        loading={isLoading}
        emptyMessage="No hay datos para el período seleccionado"
      />
    </div>
  );
}
