"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, X, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Inventario } from "@/types/stock";

interface ProductDetailModalProps {
  inventario: Inventario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductDetailModal({
  inventario,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  if (!inventario) return null;

  const producto = inventario.producto;
  const precio = Number(inventario.precioActual) || Number(producto.precioSugerido) || 0;
  const proveedor = producto.proveedores?.[0]?.proveedor?.nombre ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Imagen */}
          <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center min-h-[250px]">
            {producto.imagenUrl ? (
              <img
                src={producto.imagenUrl}
                alt={producto.nombre}
                className="object-contain w-full h-full"
              />
            ) : (
              <Package className="w-24 h-24 text-indigo-200" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  {producto.nombre}
                </DialogTitle>
                <DialogDescription className="text-gray-500">
                  {producto.descripcion ?? "Sin descripción"}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex gap-2 flex-wrap">
                {producto.categoria && (
                  <Badge variant="outline" className="capitalize">
                    {producto.categoria}
                  </Badge>
                )}
                {producto.sku && (
                  <Badge variant="secondary">SKU: {producto.sku}</Badge>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Stock disponible:</strong> {inventario.stockActual} {producto.unidadMedida ?? "unidades"}
                </p>
                {proveedor && (
                  <p className="text-sm text-gray-600">
                    <strong>Proveedor:</strong> {proveedor}
                  </p>
                )}
              </div>

              <p className="text-3xl font-semibold text-indigo-600 mt-6">
                ${precio.toLocaleString("es-AR")}
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end mt-6 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-1" /> Cerrar
              </Button>
              <Link href="/dashboard/stock/ventas">
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Ir a ventas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
