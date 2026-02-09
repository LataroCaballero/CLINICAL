"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { SerieTemporalItem } from "@/types/reportes";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ChartTendenciasProps {
  titulo: string;
  datos: SerieTemporalItem[];
  tipo?: "linea" | "barra";
  color?: string;
  loading?: boolean;
  formatoValor?: (valor: number) => string;
  height?: number;
}

export function ChartTendencias({
  titulo,
  datos,
  tipo = "linea",
  color = "#6366f1",
  loading = false,
  formatoValor = (v) => v.toString(),
  height = 300,
}: ChartTendenciasProps) {
  // Formatear los datos para el gráfico
  const datosFormateados = datos.map((item) => ({
    ...item,
    fechaFormateada: format(parseISO(item.fecha), "EEE dd", { locale: es }),
    fechaCompleta: format(parseISO(item.fecha), "EEEE d 'de' MMMM", { locale: es }),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 capitalize">
            {data.fechaCompleta}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {formatoValor(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : datos.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-400">
            No hay datos disponibles
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {tipo === "linea" ? (
              <LineChart data={datosFormateados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="fechaFormateada"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={formatoValor}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={datosFormateados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="fechaFormateada"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={formatoValor}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface ChartComparativoProps {
  titulo: string;
  datosIngresos: SerieTemporalItem[];
  datosTurnos: SerieTemporalItem[];
  loading?: boolean;
  height?: number;
}

export function ChartComparativo({
  titulo,
  datosIngresos,
  datosTurnos,
  loading = false,
  height = 350,
}: ChartComparativoProps) {
  // Combinar los datos
  const datosCombinados = datosIngresos.map((ingreso, index) => ({
    fecha: ingreso.fecha,
    fechaFormateada: format(parseISO(ingreso.fecha), "EEE dd", { locale: es }),
    ingresos: ingreso.valor,
    turnos: datosTurnos[index]?.valor ?? 0,
  }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === "Ingresos" ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={datosCombinados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="fechaFormateada"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="turnos"
                name="Turnos"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: "#6366f1", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
