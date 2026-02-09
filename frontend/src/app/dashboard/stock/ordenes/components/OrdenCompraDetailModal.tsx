"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Clock, Send, XCircle } from "lucide-react";
import { OrdenCompra, EstadoOrdenCompra } from "@/types/stock";

interface OrdenCompraDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: OrdenCompra | null;
}

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

export default function OrdenCompraDetailModal({
  open,
  onOpenChange,
  orden,
}: OrdenCompraDetailModalProps) {
  if (!orden) return null;

  const total =
    orden.total ||
    orden.items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Orden #{orden.id.slice(0, 8)}
            {getEstadoBadge(orden.estado)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Proveedor:</span>
              <p className="font-medium">{orden.proveedor?.nombre}</p>
            </div>
            <div>
              <span className="text-gray-500">Fecha creación:</span>
              <p className="font-medium">{formatDate(orden.fechaCreacion)}</p>
            </div>
            {orden.fechaRecepcion && (
              <div>
                <span className="text-gray-500">Fecha recepción:</span>
                <p className="font-medium">
                  {formatDate(orden.fechaRecepcion)}
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Condición de pago:</span>
              <p className="font-medium">
                {getCondicionPagoLabel(orden.condicionPago)}
                {orden.cantidadCuotas && orden.cantidadCuotas > 1 && (
                  <span className="text-gray-400 ml-1">
                    ({orden.cantidadCuotas} cuotas)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Productos</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orden.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.producto?.nombre || "Producto"}
                      {item.producto?.sku && (
                        <span className="text-gray-400 text-xs ml-2">
                          ({item.producto.sku})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.cantidad}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(item.precioUnitario)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(item.cantidad * item.precioUnitario)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-gray-500 text-lg">Total:</span>
            <span className="text-2xl font-bold">{formatMoney(total)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
