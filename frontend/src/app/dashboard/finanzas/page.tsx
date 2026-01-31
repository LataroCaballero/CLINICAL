"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  FileText,
  Receipt,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  useFinanzasDashboard,
  usePresupuestosFinanzas,
  usePracticasPendientes,
} from "@/hooks/useFinanzas";
import { EstadoPresupuesto, EstadoLiquidacion } from "@/types/finanzas";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface AlertItem {
  label: string;
  count: number;
  severity: "warning" | "info" | "success";
  action?: string;
  actionHref?: string;
}

interface AlertCardProps {
  title: string;
  alerts: AlertItem[];
  icon: React.ReactNode;
  href: string;
  loading?: boolean;
}

function AlertCard({ title, alerts, icon, href, loading }: AlertCardProps) {
  const activeAlerts = alerts.filter((a) => a.count > 0);
  const hasAlerts = activeAlerts.length > 0;

  return (
    <Card
      className={`border shadow-sm ${
        hasAlerts ? "border-amber-200" : "border-emerald-200"
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </div>
        {!hasAlerts && !loading && (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Todo al día
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {alert.severity === "warning" && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  {alert.severity === "info" && (
                    <Clock className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-sm text-gray-600">{alert.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {alert.count}
                  </Badge>
                </div>
                {alert.actionHref && (
                  <Link href={alert.actionHref}>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                      {alert.action}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
            {!hasAlerts && (
              <p className="text-sm text-gray-400">No hay alertas pendientes</p>
            )}
          </div>
        )}
        <div className="mt-4 pt-3 border-t">
          <Link href={href}>
            <Button variant="outline" size="sm" className="w-full">
              Ir a {title}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanzasPage() {
  const { data: kpis, isLoading: loadingKPIs } = useFinanzasDashboard();
  const { data: presupuestos, isLoading: loadingPresupuestos } =
    usePresupuestosFinanzas({});
  const { data: practicas, isLoading: loadingPracticas } = usePracticasPendientes({
    estadoLiquidacion: EstadoLiquidacion.PENDIENTE,
  });

  // Calcular alertas de Balance
  const balanceAlerts: AlertItem[] = [
    {
      label: "Cuentas morosas (+90 días)",
      count: kpis?.cantidadDeudores ?? 0,
      severity: "warning",
      action: "Ver morosos",
      actionHref: "/dashboard/finanzas/balance?tab=cuentas&estado=MOROSO",
    },
  ];

  // Calcular alertas de Presupuestos
  const presupuestosEnviados =
    presupuestos?.filter((p) => p.estado === EstadoPresupuesto.ENVIADO).length ?? 0;
  const presupuestosBorrador =
    presupuestos?.filter((p) => p.estado === EstadoPresupuesto.BORRADOR).length ?? 0;

  const presupuestosAlerts: AlertItem[] = [
    {
      label: "Enviados sin respuesta",
      count: presupuestosEnviados,
      severity: "info",
      action: "Ver enviados",
      actionHref: "/dashboard/finanzas/presupuestos?estado=ENVIADO",
    },
    {
      label: "Borradores pendientes",
      count: presupuestosBorrador,
      severity: "info",
      action: "Completar",
      actionHref: "/dashboard/finanzas/presupuestos?estado=BORRADOR",
    },
  ];

  // Calcular alertas de Facturación
  const practicasPendientes = practicas?.length ?? 0;

  const facturacionAlerts: AlertItem[] = [
    {
      label: "Prácticas pendientes de liquidar",
      count: practicasPendientes,
      severity: "warning",
      action: "Liquidar",
      actionHref: "/dashboard/finanzas/facturacion?tab=liquidaciones",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Finanzas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen de alertas y acciones pendientes
        </p>
      </div>

      {/* Cards de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AlertCard
          title="Balance"
          alerts={balanceAlerts}
          icon={<Wallet className="w-5 h-5 text-indigo-500" />}
          href="/dashboard/finanzas/balance"
          loading={loadingKPIs}
        />

        <AlertCard
          title="Presupuestos"
          alerts={presupuestosAlerts}
          icon={<FileText className="w-5 h-5 text-indigo-500" />}
          href="/dashboard/finanzas/presupuestos"
          loading={loadingPresupuestos}
        />

        <AlertCard
          title="Facturación"
          alerts={facturacionAlerts}
          icon={<Receipt className="w-5 h-5 text-indigo-500" />}
          href="/dashboard/finanzas/facturacion"
          loading={loadingPracticas}
        />
      </div>

      {/* Resumen rápido de KPIs */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resumen del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Ingresos Hoy</p>
              {loadingKPIs ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-xl font-semibold">
                  {formatMoney(kpis?.ingresosHoy ?? 0)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos del Mes</p>
              {loadingKPIs ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-emerald-600">
                  {formatMoney(kpis?.ingresosMes ?? 0)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Por Cobrar</p>
              {loadingKPIs ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-amber-600">
                  {formatMoney(kpis?.cuentasPorCobrar ?? 0)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Pend. Liquidación</p>
              {loadingKPIs ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-xl font-semibold">
                  {formatMoney(kpis?.pendientesLiquidacion ?? 0)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
