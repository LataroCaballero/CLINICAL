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
import Image from "next/image";
import { useEffect, useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function ProductDetailModal({ product, open, onOpenChange }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Imagen */}
          <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-gray-100">
            <Image
              src={product.imagen}
              alt={product.nombre}
              fill
              className="object-contain"
            />
          </div>

          {/* Info */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  {product.nombre}
                </DialogTitle>
                <DialogDescription className="text-gray-500">
                  {product.descripcion}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                <Badge variant="outline" className="capitalize">
                  {product.categoria}
                </Badge>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Stock disponible:</strong> {product.stock}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Proveedor:</strong> {product.proveedor ?? "—"}
                </p>
              </div>

              <p className="text-3xl font-semibold text-indigo-600 mt-6">
                ${product.precio.toLocaleString("es-AR")}
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end mt-6 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-1" /> Cerrar
              </Button>
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Agregar al carrito
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
