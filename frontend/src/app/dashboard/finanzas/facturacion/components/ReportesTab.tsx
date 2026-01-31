"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useReporteIngresos } from "@/hooks/useFinanzas";
import { MedioPago, ReporteIngresosParams } from "@/types/finanzas";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const COLORS = ["#4F46E5", "#22C55E", "#F97316", "#EAB308", "#EC4899", "#06B6D4"];

const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  [MedioPago.EFECTIVO]: "Efectivo",
  [MedioPago.TRANSFERENCIA]: "Transferencia",
  [MedioPago.TARJETA_DEBITO]: "Tarjeta Débito",
  [MedioPago.TARJETA_CREDITO]: "Tarjeta Crédito",
  [MedioPago.MERCADO_PAGO]: "Mercado Pago",
  [MedioPago.OTRO]: "Otro",
};

function exportToCSV(data: any[], filename: string, headers: string[]) {
  const rows = data.map((row) => headers.map((h) => row[h] || "").join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}

export default function ReportesTab() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [params, setParams] = useState<ReporteIngresosParams>({
    fechaDesde: firstDayOfMonth.toISOString().split("T")[0],
    fechaHasta: today.toISOString().split("T")[0],
  });

  const { data: reporte, isLoading } = useReporteIngresos(params);

  const handleExportIngresos = () => {
    if (!reporte?.porDia) return;
    exportToCSV(
      reporte.porDia.map((d) => ({ fecha: d.fecha, total: d.total })),
      `ingresos_${params.fechaDesde}_${params.fechaHasta}`,
      ["fecha", "total"]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros de Período */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Desde</label>
              <Input
                type="date"
                value={params.fechaDesde}
                onChange={(e) => setParams({ ...params, fechaDesde: e.target.value })}
                className="w-[180px]"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Hasta</label>
              <Input
                type="date"
                value={params.fechaHasta}
                onChange={(e) => setParams({ ...params, fechaHasta: e.target.value })}
                className="w-[180px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  setParams({
                    fechaDesde: new Date(d.getFullYear(), d.getMonth(), 1)
                      .toISOString()
                      .split("T")[0],
                    fechaHasta: d.toISOString().split("T")[0],
                  });
                }}
              >
                Este mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setParams({
                    fechaDesde: d.toISOString().split("T")[0],
                    fechaHasta: new Date().toISOString().split("T")[0],
                  });
                }}
              >
                Últimos 30 días
              </Button>
            </div>
            <div className="ml-auto">
              <Button onClick={handleExportIngresos}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="ingresos" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Ingresos
          </TabsTrigger>
          <TabsTrigger value="medios" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Medios de Pago
          </TabsTrigger>
          <TabsTrigger value="obras-sociales" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Obras Sociales
          </TabsTrigger>
        </TabsList>

        {/* Tab Resumen */}
        <TabsContent value="resumen" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Total Ingresos</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-emerald-600">
                    {formatMoney(reporte?.total ?? 0)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Cantidad de Pagos</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-800">
                    {reporte?.cantidad ?? 0}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Promedio por Pago</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-800">
                    {reporte?.cantidad
                      ? formatMoney((reporte.total ?? 0) / reporte.cantidad)
                      : formatMoney(0)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Ingresos */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Ingresos en el período
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reporte?.porDia || []}>
                    <defs>
                      <linearGradient id="colorTotalReportes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatMoney(value), "Ingresos"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTotalReportes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Ingresos por Día */}
        <TabsContent value="ingresos" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Ingresos por Día</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reporte?.porDia || [])
                      .slice()
                      .reverse()
                      .map((dia) => (
                        <TableRow key={dia.fecha}>
                          <TableCell>
                            {new Date(dia.fecha).toLocaleDateString("es-AR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatMoney(dia.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Medios de Pago */}
        <TabsContent value="medios" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Distribución por Medio de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reporte?.porMedioPago?.map((m) => ({
                          name: MEDIO_PAGO_LABELS[m.medioPago] || m.medioPago,
                          value: m.total,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={(props) =>
                          `${props.name} (${((props.percent as number) * 100).toFixed(0)}%)`
                        }
                      >
                        {reporte?.porMedioPago?.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMoney(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Tabla de Medios */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium">Detalle</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reporte?.porMedioPago?.map((m, i) => (
                        <TableRow key={m.medioPago}>
                          <TableCell className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            {MEDIO_PAGO_LABELS[m.medioPago] || m.medioPago}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatMoney(m.total)}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {reporte?.total
                              ? ((m.total / reporte.total) * 100).toFixed(1)
                              : 0}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Obras Sociales */}
        <TabsContent value="obras-sociales" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Ingresos por Obra Social / Particular
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reporte?.porObraSocial || []}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tick={{ fontSize: 11 }}
                      width={90}
                    />
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Bar dataKey="total" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabla Detalle */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Detalle</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obra Social / Tipo</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporte?.porObraSocial?.map((os) => (
                      <TableRow key={os.obraSocialId}>
                        <TableCell className="font-medium">{os.nombre}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(os.total)}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {reporte?.total
                            ? ((os.total / reporte.total) * 100).toFixed(1)
                            : 0}
                          %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
