"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Package,
  AlertTriangle,
  Check,
  Clock,
  XCircle,
  Send,
  Eye,
} from "lucide-react";
import {
  useOrdenesCompra,
  useRecibirOrdenCompra,
  useActualizarEstadoOrden,
} from "@/hooks/useOrdenesCompra";
import { EstadoOrdenCompra, OrdenCompra } from "@/types/stock";
import CargaFacturaModal from "./components/CargaFacturaModal";
import OrdenCompraDetailModal from "./components/OrdenCompraDetailModal";
import { toast } from "sonner";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getEstadoBadge(estado: EstadoOrdenCompra) {
  switch (estado) {
    case "PENDIENTE":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>
      );
    case "ENVIADA":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          <Send className="w-3 h-3 mr-1" />
          Enviada
        </Badge>
      );
    case "RECIBIDA":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
          <Check className="w-3 h-3 mr-1" />
          Recibida
        </Badge>
      );
    case "CANCELADA":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelada
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

function getCondicionPagoLabel(condicion?: string): string {
  switch (condicion) {
    case "CONTADO":
      return "Contado";
    case "DIAS_30":
      return "30 días";
    case "DIAS_60":
      return "60 días";
    case "DIAS_90":
      return "90 días";
    case "PERSONALIZADO":
      return "Personalizado";
    default:
      return "Contado";
  }
}

export default function OrdenesCompraPage() {
  const [estadoFilter, setEstadoFilter] = useState<EstadoOrdenCompra | "TODOS">(
    "TODOS"
  );
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);

  const {
    data: ordenes,
    isLoading,
    error,
    refetch,
  } = useOrdenesCompra(estadoFilter === "TODOS" ? undefined : estadoFilter);

  const recibirOrden = useRecibirOrdenCompra();
  const actualizarEstado = useActualizarEstadoOrden();

  const handleViewDetail = (orden: OrdenCompra) => {
    setSelectedOrden(orden);
    setDetailModalOpen(true);
  };

  const handleRecibir = async (orden: OrdenCompra) => {
    try {
      await recibirOrden.mutateAsync({ id: orden.id });
      toast.success("Orden recibida correctamente");
      refetch();
    } catch {
      toast.error("Error al recibir la orden");
    }
  };

  const handleMarcarEnviada = async (orden: OrdenCompra) => {
    try {
      await actualizarEstado.mutateAsync({ id: orden.id, estado: "ENVIADA" });
      toast.success("Orden marcada como enviada");
      refetch();
    } catch {
      toast.error("Error al actualizar la orden");
    }
  };

  const calcularTotal = (orden: OrdenCompra): number => {
    if (orden.total) return orden.total;
    return orden.items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Órdenes de Compra
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las compras a proveedores
          </p>
        </div>
        <Button
          className="bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={() => setNewModalOpen(true)}
        >
          <FileText className="w-4 h-4 mr-2" />
          Cargar Factura
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="w-[200px]">
              <Select
                value={estadoFilter}
                onValueChange={(v) =>
                  setEstadoFilter(v as EstadoOrdenCompra | "TODOS")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                  <SelectItem value="ENVIADA">Enviadas</SelectItem>
                  <SelectItem value="RECIBIDA">Recibidas</SelectItem>
                  <SelectItem value="CANCELADA">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">Error al cargar las órdenes</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : ordenes?.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay órdenes de compra</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setNewModalOpen(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Cargar primera factura
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Condición Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes?.map((orden) => (
                  <TableRow key={orden.id}>
                    <TableCell className="font-mono text-xs">
                      {orden.numeroFactura || `#${orden.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="font-medium">
                      {orden.proveedor?.nombre}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(orden.fechaCreacion)}
                    </TableCell>
                    <TableCell>{orden.items.length} productos</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(calcularTotal(orden))}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {getCondicionPagoLabel(orden.condicionPago)}
                        {orden.cantidadCuotas && orden.cantidadCuotas > 1 && (
                          <span className="text-gray-400 ml-1">
                            ({orden.cantidadCuotas} cuotas)
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{getEstadoBadge(orden.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(orden)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {orden.estado === "PENDIENTE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarcarEnviada(orden)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                        {(orden.estado === "PENDIENTE" ||
                          orden.estado === "ENVIADA") && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleRecibir(orden)}
                            disabled={recibirOrden.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Recibir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CargaFacturaModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={() => {
          refetch();
          setNewModalOpen(false);
        }}
      />

      <OrdenCompraDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        orden={selectedOrden}
      />
    </div>
  );
}
