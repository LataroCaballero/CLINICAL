"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table";
import { Package, AlertTriangle, PlusCircle, MinusCircle } from "lucide-react";

export default function ProductDetailModal({ open, onOpenChange, product }: any) {
  if (!product) return null;

  const movimientosMock = [
    {
      id: 1,
      tipo: "Ingreso",
      cantidad: 20,
      fecha: "02/11/2025",
      motivo: "Compra a proveedor",
    },
    {
      id: 2,
      tipo: "Egreso",
      cantidad: 5,
      fecha: "05/11/2025",
      motivo: "Uso en procedimiento quirúrgico",
    },
  ];

  const estado =
    product.stockActual === 0
      ? "Sin stock"
      : product.stockActual < product.stockMinimo
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalle del Producto</DialogTitle>
          <DialogDescription>
            Información completa, movimientos y estado del inventario.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          {/* --- Información del producto --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Nombre del producto</Label>
              <Input value={product.nombre} readOnly />
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={product.categoria} readOnly />
            </div>

            <div>
              <Label>Proveedor</Label>
              <Input value={product.proveedor} readOnly />
            </div>
            <div>
              <Label>Fecha de vencimiento</Label>
              <Input
                value={new Date(product.vencimiento).toLocaleDateString("es-AR")}
                readOnly
              />
            </div>

            <div>
              <Label>Stock actual</Label>
              <Input value={product.stockActual} readOnly />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input value={product.stockMinimo} readOnly />
            </div>

            <div className="col-span-2">
              <Label>Estado</Label>
              <div
                className={`mt-1 w-fit px-3 py-1 rounded text-sm font-medium ${color}`}
              >
                {estado}
              </div>
            </div>
          </div>

          {/* --- Historial de movimientos --- */}
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-3">
              Historial de movimientos
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosMock.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="flex items-center gap-2">
                      {m.tipo === "Ingreso" ? (
                        <PlusCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <MinusCircle className="w-4 h-4 text-red-500" />
                      )}
                      {m.tipo}
                    </TableCell>
                    <TableCell>{m.cantidad}</TableCell>
                    <TableCell>{m.fecha}</TableCell>
                    <TableCell>{m.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {movimientosMock.length === 0 && (
              <p className="text-sm text-gray-500 italic py-4 text-center">
                No hay movimientos registrados para este producto.
              </p>
            )}
          </div>
        </ScrollArea>

        {/* --- Footer con acciones --- */}
        <DialogFooter className="flex justify-between items-center border-t pt-3 mt-3 mr-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
