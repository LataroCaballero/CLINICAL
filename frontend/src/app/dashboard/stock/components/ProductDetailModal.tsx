"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, MinusCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMovimientosStock } from "@/hooks/useInventario";
import { Inventario, TipoMovimientoStock } from "@/types/stock";

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventario: Inventario | null;
}

export default function ProductDetailModal({
  open,
  onOpenChange,
  inventario,
}: ProductDetailModalProps) {
  const { data: movimientos, isLoading } = useMovimientosStock(
    inventario?.productoId ?? null
  );

  if (!inventario) return null;

  const producto = inventario.producto;
  const proveedor = producto.proveedores?.[0]?.proveedor?.nombre ?? "-";

  const estado =
    inventario.stockActual === 0
      ? "Sin stock"
      : inventario.stockActual < inventario.stockMinimo
      ? "Bajo stock"
      : "Stock OK";

  const color =
    estado === "Stock OK"
      ? "text-green-600 bg-green-50"
      : estado === "Bajo stock"
      ? "text-orange-600 bg-orange-50"
      : "text-red-600 bg-red-50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{producto.nombre}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4 overflow-x-hidden">
          {/* Información del producto */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <InfoItem label="Categoría" value={producto.categoria ?? "-"} />
            <InfoItem label="SKU" value={producto.sku ?? "-"} />
            <InfoItem label="Proveedor" value={proveedor} />
            <InfoItem
              label="Tipo"
              value={getTipoProductoLabel(producto.tipo)}
            />
            <InfoItem
              label="Precio"
              value={
                inventario.precioActual
                  ? `$${Number(inventario.precioActual).toLocaleString("es-AR")}`
                  : "-"
              }
            />
            <InfoItem
              label="Unidad"
              value={producto.unidadMedida ?? "-"}
            />
          </div>

          {/* Stock */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-500">Stock actual</p>
              <p className="text-2xl font-bold text-gray-800">
                {inventario.stockActual}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Stock mínimo</p>
              <p className="text-2xl font-bold text-gray-800">
                {inventario.stockMinimo}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Estado</p>
              <div className={`mt-1 px-3 py-1 rounded text-sm font-medium ${color} inline-block`}>
                {estado}
              </div>
            </div>
          </div>

          {/* Historial de movimientos */}
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-3">
              Historial de movimientos
            </h4>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : movimientos && movimientos.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Cantidad</TableHead>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getMovimientoIcon(m.tipo)}
                            <span>{getTipoMovimientoLabel(m.tipo)}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right whitespace-nowrap ${
                            m.tipo === "ENTRADA"
                              ? "text-green-600 font-medium"
                              : m.tipo === "SALIDA"
                              ? "text-red-600 font-medium"
                              : "font-medium"
                          }`}
                        >
                          {m.tipo === "ENTRADA" ? "+" : m.tipo === "SALIDA" ? "-" : ""}
                          {m.cantidad}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(m.fecha), "dd/MM/yy HH:mm", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm text-gray-600">
                          {m.motivo ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4 text-center">
                No hay movimientos registrados para este producto.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-3 mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

function getTipoProductoLabel(tipo: string): string {
  switch (tipo) {
    case "INSUMO":
      return "Insumo";
    case "PRODUCTO_VENTA":
      return "Producto de venta";
    case "USO_INTERNO":
      return "Uso interno";
    default:
      return tipo;
  }
}

function getTipoMovimientoLabel(tipo: TipoMovimientoStock): string {
  switch (tipo) {
    case "ENTRADA":
      return "Ingreso";
    case "SALIDA":
      return "Egreso";
    case "AJUSTE":
      return "Ajuste";
    default:
      return tipo;
  }
}

function getMovimientoIcon(tipo: TipoMovimientoStock) {
  switch (tipo) {
    case "ENTRADA":
      return <PlusCircle className="w-4 h-4 text-green-500" />;
    case "SALIDA":
      return <MinusCircle className="w-4 h-4 text-red-500" />;
    case "AJUSTE":
      return <RefreshCw className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
}
