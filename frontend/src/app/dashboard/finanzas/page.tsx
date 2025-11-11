"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, Users, FileText, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useState } from "react";

const COLORS = ["#4F46E5", "#22C55E", "#F97316", "#EAB308"];

export default function FinanzasPage() {
  // Datos simulados para demo
  const [metricas] = useState({
    ingresosMes: 1250000,
    pagosPendientes: 85000,
    cuentasPorCobrar: 170000,
    pacientesDeudores: 12,
  });

  const dataPagos = [
    { name: "Efectivo", value: 480000 },
    { name: "Transferencia", value: 360000 },
    { name: "Tarjeta", value: 310000 },
    { name: "Otros", value: 100000 },
  ];

  const dataIngresos = [
    { semana: "Semana 1", ingresos: 250000 },
    { semana: "Semana 2", ingresos: 280000 },
    { semana: "Semana 3", ingresos: 310000 },
    { semana: "Semana 4", ingresos: 350000 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Resumen Financiero</h1>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ingresos del mes</CardTitle>
            <DollarSign className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-gray-800">
              ${metricas.ingresosMes.toLocaleString("es-AR")}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pagos pendientes</CardTitle>
            <CreditCard className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-gray-800">
              ${metricas.pagosPendientes.toLocaleString("es-AR")}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cuentas por cobrar</CardTitle>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-gray-800">
              ${metricas.cuentasPorCobrar.toLocaleString("es-AR")}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pacientes con deuda</CardTitle>
            <Users className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-gray-800">
              {metricas.pacientesDeudores}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-700">Distribución por método de pago</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataPagos} dataKey="value" nameKey="name" outerRadius={100} label>
                  {dataPagos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-700">Evolución semanal de ingresos</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataIngresos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ingresos" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
          <FileText className="w-5 h-5" />
          Cuentas Corrientes
        </Button>
        <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
          <CreditCard className="w-5 h-5" />
          Facturación
        </Button>
        <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
          <DollarSign className="w-5 h-5" />
          Pagos
        </Button>
        <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
          <BarChart3 className="w-5 h-5" />
          Reportes
        </Button>
      </div>
    </div>
  );
}
