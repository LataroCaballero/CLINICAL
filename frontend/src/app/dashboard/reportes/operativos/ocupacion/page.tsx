"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosReporte, FiltrosValues } from "../../components/FiltrosReporte";
import { TablaReporte, ColumnDef, PercentCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import { useReporteOcupacion, OcupacionPorProfesional } from "@/hooks/useReportesOperativos";
import { Activity, Users, CheckCircle } from "lucide-react";

export default function ReporteOcupacionPage() {
  const [filters, setFilters] = useState<FiltrosValues>({});
  const { data: reporte, isLoading } = useReporteOcupacion({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
  });

  const handleFilterChange = (newFilters: FiltrosValues) => {
    setFilters(newFilters);
  };

  const columnasOcupacion: ColumnDef<OcupacionPorProfesional>[] = [
    { key: "nombre", header: "Profesional" },
    { key: "especialidad", header: "Especialidad" },
    { key: "turnosDisponibles", header: "Disponibles", align: "center" },
    { key: "turnosAgendados", header: "Agendados", align: "center" },
    { key: "turnosCompletados", header: "Completados", align: "center" },
    {
      key: "tasaOcupacion",
      header: "Ocupación",
      align: "right",
      render: (value: number) => <PercentCell value={value} threshold={60} />,
    },
    {
      key: "tasaEfectividad",
      header: "Efectividad",
      align: "right",
      render: (value: number) => <PercentCell value={value} threshold={70} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reporte de Ocupación</h1>
          <p className="text-gray-500">Análisis de ocupación de agenda por profesional</p>
        </div>
        <ExportButton
          tipoReporte="ocupacion"
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

      {/* KPI Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tasa de Ocupación General</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : `${(reporte?.tasaOcupacionGeneral ?? 0).toFixed(1)}%`}
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
                <p className="text-sm text-gray-500">Profesionales Activos</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "-" : reporte?.porProfesional?.length ?? 0}
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
                <p className="text-sm text-gray-500">Turnos Completados</p>
                <p className="text-2xl font-semibold">
                  {isLoading
                    ? "-"
                    : reporte?.porProfesional?.reduce(
                        (acc, p) => acc + p.turnosCompletados,
                        0
                      ) ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla por profesional */}
      <TablaReporte
        titulo="Ocupación por Profesional"
        subtitulo="Detalle de agenda y efectividad"
        columnas={columnasOcupacion}
        datos={reporte?.porProfesional ?? []}
        loading={isLoading}
        emptyMessage="No hay datos de ocupación disponibles"
      />
    </div>
  );
}
