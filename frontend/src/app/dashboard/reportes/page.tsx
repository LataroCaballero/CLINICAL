"use client";

import {
  Calendar,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  FileText,
  PieChart,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useReportesDashboard } from "@/hooks/useReportesDashboard";
import { ReporteCard, ReporteCardGrid } from "./components/ReporteCard";
import { ChartTendencias, ChartComparativo } from "./components/ChartTendencias";
import { ProximosTurnos } from "./components/ProximosTurnos";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}

function QuickLink({ href, icon, label, description, badge, disabled }: QuickLinkProps) {
  const content = (
    <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${disabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{label}</h3>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  return <Link href={href}>{content}</Link>;
}

export default function ReportesPage() {
  const { data: dashboard, isLoading } = useReportesDashboard();

  // Calcular variaciones (simuladas por ahora - en el futuro se pueden calcular del backend)
  const tasaCompletado = dashboard
    ? formatPercent(dashboard.turnosCompletados, dashboard.turnosHoy)
    : 0;

  const tasaAusentismo = dashboard
    ? formatPercent(dashboard.turnosAusentes, dashboard.turnosHoy)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Dashboard de Reportes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen de métricas y KPIs en tiempo real
          </p>
        </div>
        {(dashboard?.alertasPendientes ?? 0) > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 py-1.5 px-3">
            <AlertTriangle className="w-4 h-4 mr-1" />
            {dashboard?.alertasPendientes ?? 0} alertas pendientes
          </Badge>
        )}
      </div>

      {/* KPIs del día */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          KPIs del Día
        </h2>
        <ReporteCardGrid columns={5}>
          <ReporteCard
            titulo="Turnos Hoy"
            valor={dashboard?.turnosHoy ?? 0}
            icono={<Calendar className="w-5 h-5 text-indigo-500" />}
            loading={isLoading}
          />
          <ReporteCard
            titulo="Completados"
            valor={dashboard?.turnosCompletados ?? 0}
            subtitulo={`${tasaCompletado.toFixed(0)}% del total`}
            icono={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            loading={isLoading}
            colorClase="text-emerald-600"
          />
          <ReporteCard
            titulo="Pendientes"
            valor={dashboard?.turnosPendientes ?? 0}
            icono={<Clock className="w-5 h-5 text-amber-500" />}
            loading={isLoading}
            colorClase="text-amber-600"
          />
          <ReporteCard
            titulo="Ausentes"
            valor={dashboard?.turnosAusentes ?? 0}
            subtitulo={tasaAusentismo > 0 ? `${tasaAusentismo.toFixed(0)}% ausentismo` : undefined}
            icono={<UserX className="w-5 h-5 text-red-500" />}
            loading={isLoading}
            colorClase={(dashboard?.turnosAusentes ?? 0) > 0 ? "text-red-600" : "text-gray-900"}
          />
          <ReporteCard
            titulo="Ingresos Hoy"
            valor={formatMoney(dashboard?.ingresosHoy ?? 0)}
            icono={<DollarSign className="w-5 h-5 text-emerald-500" />}
            loading={isLoading}
            colorClase="text-emerald-600"
          />
        </ReporteCardGrid>
      </section>

      {/* Gráficos y Próximos Turnos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de tendencias */}
        <div className="lg:col-span-2">
          <ChartComparativo
            titulo="Tendencias de la Semana"
            datosIngresos={dashboard?.tendencias.ingresosSemana ?? []}
            datosTurnos={dashboard?.tendencias.turnosSemana ?? []}
            loading={isLoading}
          />
        </div>

        {/* Próximos turnos */}
        <div>
          <ProximosTurnos
            turnos={dashboard?.proximosTurnos ?? []}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Reportes Operativos */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Reportes Operativos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLink
            href="/dashboard/reportes/operativos/turnos"
            icon={<Calendar className="w-5 h-5" />}
            label="Turnos"
            description="Análisis de turnos por período y estado"
          />
          <QuickLink
            href="/dashboard/reportes/operativos/ausentismo"
            icon={<UserX className="w-5 h-5" />}
            label="Ausentismo"
            description="Tasa de ausentismo por paciente"
          />
          <QuickLink
            href="/dashboard/reportes/operativos/ocupacion"
            icon={<Clock className="w-5 h-5" />}
            label="Ocupación"
            description="Ocupación de agenda por profesional"
          />
          <QuickLink
            href="/dashboard/reportes/operativos/procedimientos"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Procedimientos"
            description="Ranking de procedimientos realizados"
          />
        </div>
      </section>

      {/* Reportes Financieros */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Reportes Financieros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLink
            href="/dashboard/reportes/financieros/ingresos"
            icon={<TrendingUp className="w-5 h-5" />}
            label="Ingresos"
            description="Análisis de ingresos por período"
          />
          <QuickLink
            href="/dashboard/reportes/financieros/cuentas"
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Cuentas por Cobrar"
            description="Deudas y morosidad de pacientes"
          />
          <QuickLink
            href="/dashboard/reportes/operativos/ventas"
            icon={<PieChart className="w-5 h-5" />}
            label="Ventas de Productos"
            description="Ventas de productos del inventario"
          />
        </div>
      </section>
    </div>
  );
}
