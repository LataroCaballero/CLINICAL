"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Loader2, AlertTriangle, Package } from "lucide-react";
import ProductDetailModal from "./components/ProductDetailModal";
import { useInventario } from "@/hooks/useInventario";
import { useCategorias } from "@/hooks/useProductos";
import { Inventario } from "@/types/stock";

export default function CatalogoPage() {
  const [categoria, setCategoria] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);

  // Datos reales del backend
  const { data: inventario, isLoading, error } = useInventario();
  const { data: categoriasData } = useCategorias();

  // Filtrar solo productos de venta con stock > 0
  const productosFiltrados = inventario?.filter(
    (inv) =>
      inv.producto.tipo === "PRODUCTO_VENTA" &&
      inv.stockActual > 0 &&
      (categoria === "todos" || inv.producto.categoria === categoria) &&
      inv.producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ) ?? [];

  // Obtener categorías únicas de productos de venta
  const categorias = categoriasData ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-600">Error al cargar el catálogo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">Catálogo de productos</h1>

        <div className="flex gap-3 flex-wrap md:flex-nowrap">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar producto..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productosFiltrados.map((inv) => (
          <Card
            key={inv.id}
            className="overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-200 bg-white"
          >
            <div className="relative h-56 w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
              {inv.producto.imagenUrl ? (
                <img
                  src={inv.producto.imagenUrl}
                  alt={inv.producto.nombre}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Package className="w-16 h-16 text-indigo-200" />
              )}
            </div>

            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-800">{inv.producto.nombre}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">
                {inv.producto.descripcion ?? "Sin descripción"}
              </p>
            </CardHeader>

            <CardContent>
              <p className="text-lg font-semibold text-indigo-600">
                ${(Number(inv.precioActual) || Number(inv.producto.precioSugerido) || 0).toLocaleString("es-AR")}
              </p>
              <p className="text-sm text-gray-500">Stock disponible: {inv.stockActual}</p>
              {inv.producto.categoria && (
                <Badge variant="outline" className="mt-2 capitalize">
                  {inv.producto.categoria}
                </Badge>
              )}
            </CardContent>

            <CardFooter className="flex justify-end">
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
                onClick={() => setSelectedInventario(inv)}
              >
                <ShoppingCart className="w-4 h-4" />
                Ver detalle
              </Button>
            </CardFooter>
          </Card>
        ))}

        {productosFiltrados.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10">
            No hay productos disponibles en esta categoría.
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      <ProductDetailModal
        inventario={selectedInventario}
        open={!!selectedInventario}
        onOpenChange={(open) => !open && setSelectedInventario(null)}
      />
    </div>
  );
}
