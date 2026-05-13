"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Package, AlertTriangle, Check, Clock } from "lucide-react";
import { useOrdenesConsumo, useConfirmarOrdenConsumo } from "@/hooks/useOrdenesConsumo";
import { OrdenConsumo } from "@/types/stock";
import { toast } from "sonner";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function OrdenesConsumoPage() {
  const { data: ordenes, isLoading, error, refetch } = useOrdenesConsumo();
  const confirmarOrden = useConfirmarOrdenConsumo();

  const handleConfirmar = async (orden: OrdenConsumo) => {
    try {
      await confirmarOrden.mutateAsync(orden.id);
      toast.success(`Orden de ${orden.paciente?.nombreCompleto ?? "paciente"} confirmada`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al confirmar la orden";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Órdenes de Consumo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Confirmá las órdenes generadas al registrar tratamientos en Historia Clínica
        </p>
      </div>

      {/* Table card */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">Error al cargar las órdenes</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : ordenes?.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay órdenes de consumo pendientes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha Sesión</TableHead>
                  <TableHead>Tratamientos</TableHead>
                  <TableHead>Insumos a Consumir</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes?.map((orden) => (
                  <TableRow key={orden.id}>
                    <TableCell className="font-medium">
                      {orden.paciente?.nombreCompleto ?? "-"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(orden.fechaSesion)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {orden.tratamientosSnapshot
                          .map((t) => t.nombre)
                          .join(", ") || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ul className="text-sm text-gray-700 space-y-0.5">
                        {orden.insumos.map((ins) => (
                          <li key={ins.id}>
                            {ins.producto?.nombre ?? ins.productoId}
                            {" - "}
                            {ins.cantidad}
                            {ins.producto?.unidadMedida
                              ? ` ${ins.producto.unidadMedida}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Pendiente
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleConfirmar(orden)}
                        disabled={confirmarOrden.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Confirmar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
