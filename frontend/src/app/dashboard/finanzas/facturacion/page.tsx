"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, CalendarDays, BarChart3 } from "lucide-react";
import LiquidacionDetailModal from "./components/LiquidacionDetailModal";

export default function FacturacionPage() {
  const [search, setSearch] = useState("");

  // Datos de ejemplo
  const liquidaciones = [
    {
      id: 1,
      fecha: "05/11/2025",
      paciente: "Lautaro Caballero",
      profesional: "Dr. Pérez",
      obraSocial: "OSDE",
      practica: "001 - Control post-operatorio",
      monto: 15000,
      estado: "Pendiente",
    },
    {
      id: 2,
      fecha: "06/11/2025",
      paciente: "Ana Gómez",
      profesional: "Dra. Torres",
      obraSocial: "Swiss Medical",
      practica: "002 - Cirugía facial",
      monto: 75000,
      estado: "Pagado",
    },
  ];

  const resumenMensual = [
    { obraSocial: "OSDE", cantidad: 24, total: 480000 },
    { obraSocial: "Swiss Medical", cantidad: 12, total: 300000 },
    { obraSocial: "Particulares", cantidad: 8, total: 160000 },
  ];

  const reportes = [
    { mes: "Octubre 2025", total: 890000, pagado: 720000, pendiente: 170000 },
    { mes: "Septiembre 2025", total: 760000, pagado: 760000, pendiente: 0 },
  ];

  const [selectedLiquidacion, setSelectedLiquidacion] = useState<any | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const handleOpenDetail = (liq: any) => {
    setSelectedLiquidacion(liq);
    setOpenDetail(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Facturación</h1>

      <Tabs defaultValue="liquidaciones" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="liquidaciones" className="flex gap-2 items-center">
            <FileText className="w-4 h-4" /> Liquidaciones Pendientes
          </TabsTrigger>
          <TabsTrigger value="mensual" className="flex gap-2 items-center">
            <CalendarDays className="w-4 h-4" /> Panel Mensual
          </TabsTrigger>
          <TabsTrigger value="reportes" className="flex gap-2 items-center">
            <BarChart3 className="w-4 h-4" /> Reportes Históricos
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Liquidaciones Pendientes */}
        <TabsContent value="liquidaciones">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-base font-medium text-gray-700">
                Liquidaciones Pendientes
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por paciente..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600">
                    <tr>
                      <th className="text-left py-3 px-4">Fecha</th>
                      <th className="text-left py-3 px-4">Paciente</th>
                      <th className="text-left py-3 px-4">Profesional</th>
                      <th className="text-left py-3 px-4">Obra Social</th>
                      <th className="text-left py-3 px-4">Práctica</th>
                      <th className="text-left py-3 px-4">Monto</th>
                      <th className="text-left py-3 px-4">Estado</th>
                      <th className="text-right py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidaciones
                      .filter((l) =>
                        l.paciente.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((l) => (
                        <tr key={l.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{l.fecha}</td>
                          <td className="py-3 px-4">{l.paciente}</td>
                          <td className="py-3 px-4">{l.profesional}</td>
                          <td className="py-3 px-4">{l.obraSocial}</td>
                          <td className="py-3 px-4">{l.practica}</td>
                          <td className="py-3 px-4">${l.monto.toLocaleString("es-AR")}</td>
                          <td
                            className={`py-3 px-4 font-medium ${
                              l.estado === "Pendiente"
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                          >
                            {l.estado}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {l.estado === "Pendiente" ? (
                              <Button size="sm" variant="outline">
                                Marcar como pagado
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" disabled>
                                Pagado
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Panel Mensual */}
        <TabsContent value="mensual">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium text-gray-700">
                Panel Mensual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-gray-600">
                  <tr>
                    <th className="text-left py-3 px-4">Obra Social</th>
                    <th className="text-left py-3 px-4">Cantidad</th>
                    <th className="text-left py-3 px-4">Total</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenMensual.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{r.obraSocial}</td>
                      <td className="py-3 px-4">{r.cantidad}</td>
                      <td className="py-3 px-4">${r.total.toLocaleString("es-AR")}</td>
                      <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleOpenDetail(r)}>
                        Ver detalle
                      </Button>
                      <LiquidacionDetailModal
                        open={openDetail}
                        onOpenChange={setOpenDetail}
                        liquidacion={selectedLiquidacion}
                      />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Reportes Históricos */}
        <TabsContent value="reportes">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium text-gray-700">
                Reportes Históricos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-gray-600">
                  <tr>
                    <th className="text-left py-3 px-4">Mes</th>
                    <th className="text-left py-3 px-4">Total Facturado</th>
                    <th className="text-left py-3 px-4">Pagado</th>
                    <th className="text-left py-3 px-4">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{r.mes}</td>
                      <td className="py-3 px-4">${r.total.toLocaleString("es-AR")}</td>
                      <td className="py-3 px-4 text-green-600">
                        ${r.pagado.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 px-4 text-orange-600">
                        ${r.pendiente.toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
