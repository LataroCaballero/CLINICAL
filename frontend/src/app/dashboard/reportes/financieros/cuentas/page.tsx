"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TablaReporte, ColumnDef, formatters, CurrencyCell, BadgeCell } from "../../components/TablaReporte";
import { ExportButton } from "../../components/ExportButton";
import {
  useReporteCuentasPorCobrar,
  useReporteMorosidad,
  CuentaPorCobrar,
  CuentaMorosa,
} from "@/hooks/useReportesFinancieros";
import { DollarSign, AlertTriangle, Clock, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ReporteCuentasPage() {
  const [soloVencidas, setSoloVencidas] = useState(false);

  const { data: cuentas, isLoading: loadingCuentas } = useReporteCuentasPorCobrar({
    soloVencidas,
    limite: 100,
  });

  const { data: morosidad, isLoading: loadingMorosidad } = useReporteMorosidad({
    diasVencimiento: 30,
    limite: 50,
  });

  const columnasCuentas: ColumnDef<CuentaPorCobrar>[] = [
    { key: "nombreCompleto", header: "Paciente" },
    { key: "telefono", header: "Teléfono" },
    {
      key: "saldoActual",
      header: "Saldo Actual",
      align: "right",
      render: (value: number) => <CurrencyCell value={value} />,
    },
    {
      key: "saldoVencido",
      header: "Vencido",
      align: "right",
      render: (value: number) =>
        value > 0 ? (
          <span className="text-red-600 font-medium">{formatters.currency(value)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "ultimoMovimiento",
      header: "Último Mov.",
      render: (value: string) => (value ? formatters.date(value) : "-"),
    },
  ];

  const columnasMorosidad: ColumnDef<CuentaMorosa>[] = [
    { key: "nombreCompleto", header: "Paciente" },
    { key: "telefono", header: "Teléfono" },
    {
      key: "montoVencido",
      header: "Monto Vencido",
      align: "right",
      render: (value: number) => (
        <span className="text-red-600 font-semibold">{formatters.currency(value)}</span>
      ),
    },
    {
      key: "diasMorosidad",
      header: "Días Mora",
      align: "center",
      render: (value: number) => {
        const variant = value >= 60 ? "danger" : value >= 30 ? "warning" : "default";
        return <BadgeCell value={`${value} días`} variant={variant} />;
      },
    },
    {
      key: "ultimoPago",
      header: "Último Pago",
      render: (value: string) => (value ? formatters.date(value) : "Sin pagos"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cuentas por Cobrar</h1>
          <p className="text-gray-500">Gestión de deudas y morosidad de pacientes</p>
        </div>
        <ExportButton
          tipoReporte="cuentas-por-cobrar"
          showPdf
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total por Cobrar</p>
                <p className="text-2xl font-semibold">
                  {loadingCuentas ? "-" : formatters.currency(cuentas?.totalPorCobrar ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Vencido</p>
                <p className="text-2xl font-semibold text-red-600">
                  {loadingCuentas ? "-" : formatters.currency(cuentas?.totalVencido ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Índice Morosidad</p>
                <p className="text-2xl font-semibold">
                  {loadingMorosidad ? "-" : `${(morosidad?.indiceGeneral ?? 0).toFixed(1)}%`}
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
                <p className="text-sm text-gray-500">Cuentas con Deuda</p>
                <p className="text-2xl font-semibold">
                  {loadingCuentas ? "-" : cuentas?.cantidadCuentas ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de detalle */}
      <Tabs defaultValue="cuentas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cuentas">Cuentas por Cobrar</TabsTrigger>
          <TabsTrigger value="morosidad">Morosidad</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="solo-vencidas"
              checked={soloVencidas}
              onCheckedChange={setSoloVencidas}
            />
            <Label htmlFor="solo-vencidas">Mostrar solo cuentas vencidas</Label>
          </div>

          <TablaReporte
            titulo="Listado de Cuentas"
            subtitulo={soloVencidas ? "Solo cuentas con saldo vencido" : "Todas las cuentas con saldo"}
            columnas={columnasCuentas}
            datos={cuentas?.cuentas ?? []}
            loading={loadingCuentas}
            emptyMessage="No hay cuentas con saldo pendiente"
          />
        </TabsContent>

        <TabsContent value="morosidad">
          <TablaReporte
            titulo="Pacientes Morosos"
            subtitulo="Cuentas con más de 30 días de vencimiento"
            columnas={columnasMorosidad}
            datos={morosidad?.cuentasMorosas ?? []}
            loading={loadingMorosidad}
            emptyMessage="No hay pacientes en estado de morosidad"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
