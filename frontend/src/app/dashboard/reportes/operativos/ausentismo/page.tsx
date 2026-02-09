"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosReporte, FiltrosValues } from "../../components/FiltrosReporte";
import { TablaReporte, ColumnDef, formatters, BadgeCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import { useReporteAusentismo } from "@/hooks/useReportesOperativos";
import { PacienteAusentista } from "@/types/reportes";
import { UserX, AlertTriangle, Percent } from "lucide-react";

export default function ReporteAusentismoPage() {
  const [filters, setFilters] = useState<FiltrosValues>({});
  const { data: reporte, isLoading } = useReporteAusentismo({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    limite: 50,
  });

  const handleFilterChange = (newFilters: FiltrosValues) => {
    setFilters(newFilters);
  };

  const columnasAusentistas: ColumnDef<PacienteAusentista>[] = [
    { key: "nombreCompleto", header: "Paciente" },
    { key: "telefono", header: "Teléfono" },
    { key: "cantidadAusencias", header: "Ausencias", align: "center" },
    { key: "totalTurnos", header: "Total Turnos", align: "center" },
    {
      key: "tasaAusentismo",
      header: "Tasa",
      align: "right",
      render: (value: number) => {
        const variant = value >= 50 ? "danger" : value >= 30 ? "warning" : "default";
        return <BadgeCell value={`${value.toFixed(1)}%`} variant={variant} />;
      },
    },
    {
      key: "ultimaAusencia",
      header: "Última Ausencia",
      render: (value: string) => formatters.date(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reporte de Ausentismo</h1>
          <p className="text-gray-500">Análisis de pacientes con ausencias frecuentes</p>
        </div>
        <ExportButton
          tipoReporte="ausentismo"
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
        defaultPeriodo="90d"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Ausencias</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.totalAusencias ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Percent className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tasa General</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : `${(reporte?.tasaGeneral ?? 0).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pacientes Reincidentes</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.pacientesReincidentes?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de pacientes con más ausencias */}
      <TablaReporte
        titulo="Pacientes con Mayor Ausentismo"
        subtitulo="Ordenados por cantidad de ausencias"
        columnas={columnasAusentistas}
        datos={reporte?.pacientesReincidentes ?? []}
        loading={isLoading}
        emptyMessage="No hay registros de ausentismo en el período"
      />
    </div>
  );
}
