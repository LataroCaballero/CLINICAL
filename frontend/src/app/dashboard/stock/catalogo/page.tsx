"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search } from "lucide-react";
import Image from "next/image";
import ProductDetailModal from "./components/ProductDetailModal";

export default function CatalogoPage() {
  const [categoria, setCategoria] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Datos mock
  const productos = [
    {
      id: 1,
      nombre: "Crema Regeneradora Facial",
      descripcion: "Con ácido hialurónico y colágeno. Ideal para piel seca o dañada.",
      precio: 8500,
      stock: 12,
      categoria: "cremas",
      imagen: "/images/crema.jpg",
      usoInterno: false,
    },
    {
      id: 2,
      nombre: "Suplemento Colágeno Plus",
      descripcion: "Complemento nutricional para mejorar elasticidad de la piel.",
      precio: 12500,
      stock: 7,
      categoria: "suplementos",
      imagen: "/images/suplemento.jpg",
      usoInterno: false,
    },
    {
      id: 3,
      nombre: "Mascarilla Hidratante",
      descripcion: "Uso exclusivo interno para tratamientos post operatorios.",
      precio: 3000,
      stock: 20,
      categoria: "accesorios",
      imagen: "/images/mascarilla.jpg",
      usoInterno: true,
    },
  ];

  const productosFiltrados = productos.filter(
    (p) =>
      !p.usoInterno &&
      (categoria === "todos" || p.categoria === categoria) &&
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

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
              <SelectItem value="cremas">Cremas</SelectItem>
              <SelectItem value="suplementos">Suplementos</SelectItem>
              <SelectItem value="accesorios">Accesorios</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productosFiltrados.map((producto) => (
          <Card
            key={producto.id}
            className="overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-200 bg-white"
          >
            <div className="relative h-56 w-full">
              <Image
                src={producto.imagen}
                alt={producto.nombre}
                fill
                className="object-cover"
              />
            </div>

            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-800">{producto.nombre}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{producto.descripcion}</p>
            </CardHeader>

            <CardContent>
              <p className="text-lg font-semibold text-indigo-600">
                ${producto.precio.toLocaleString("es-AR")}
              </p>
              <p className="text-sm text-gray-500">Stock disponible: {producto.stock}</p>
              <Badge variant="outline" className="mt-2 capitalize">
                {producto.categoria}
              </Badge>
            </CardContent>

            <CardFooter className="flex justify-end">
            <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
                onClick={() => setSelectedProduct(producto)}
            >
                <ShoppingCart className="w-4 h-4" />
                Ver detalle
            </Button>

            <ProductDetailModal
                product={selectedProduct}
                open={!!selectedProduct}
                onOpenChange={() => setSelectedProduct(null)}
            />
            </CardFooter>
          </Card>
        ))}

        {productosFiltrados.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10">
            No hay productos disponibles en esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
