"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Package, PlusCircle } from "lucide-react";
import ProductDetailModal from "./components/ProductDetailModal";
import MovementModal from "./components/MovementModal";
import NewProductModal from "./components/NewProductModal";

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openNewProduct, setOpenNewProduct] = useState(false);

  const productos = [
    {
      id: 1,
      nombre: "Crema regeneradora facial",
      categoria: "Cremas",
      stockActual: 15,
      stockMinimo: 10,
      vencimiento: "2025-12-01",
      proveedor: "Laboratorios SkinLab",
    },
    {
      id: 2,
      nombre: "Suplemento colágeno hidrolizado",
      categoria: "Suplementos",
      stockActual: 5,
      stockMinimo: 10,
      vencimiento: "2025-03-15",
      proveedor: "NutraTech",
    },
    {
      id: 3,
      nombre: "Guantes quirúrgicos talla M",
      categoria: "Descartables",
      stockActual: 0,
      stockMinimo: 20,
      vencimiento: "2026-01-01",
      proveedor: "MedPro Argentina",
    },
  ];

  const totalProductos = productos.length;
  const bajosStock = productos.filter((p) => p.stockActual < p.stockMinimo).length;
  const proximosAVencer = productos.filter(
    (p) => new Date(p.vencimiento) < new Date("2025-12-31")
  ).length;
  const ultimoMovimiento = "Ingreso de stock - 10/11/2025";

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewDetail = (product: any) => {
    setSelectedProduct(product);
    setOpenModal(true);
  };

  const [openMovement, setOpenMovement] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Control de Stock</h1>

      {/* --- Cards de resumen --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ResumenCard
          title="Productos activos"
          value={totalProductos}
          icon={<Package className="w-6 h-6 text-indigo-500" />}
        />
        <ResumenCard
          title="Bajo stock"
          value={bajosStock}
          icon={<AlertTriangle className="w-6 h-6 text-orange-500" />}
        />
        <ResumenCard
          title="Próximos a vencer"
          value={proximosAVencer}
          icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
        />
        <ResumenCard
          title="Último movimiento"
          value={ultimoMovimiento}
          icon={<PlusCircle className="w-6 h-6 text-green-500" />}
        />
      </div>

      {/* --- Barra de búsqueda y acciones --- */}
      <div className="flex justify-between items-center mt-4">
        <Input
          placeholder="Buscar producto..."
          className="w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
        <Button
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => setOpenNewProduct(true)}
        >
            + Agregar producto
        </Button>

        <NewProductModal
            open={openNewProduct}
            onOpenChange={setOpenNewProduct}
            onSave={(p) => console.log("Nuevo producto:", p)}
        />
        </div>
      </div>

      {/* --- Tabla principal --- */}
      <Card className="shadow-sm mt-4">
        <CardHeader>
          <CardTitle className="text-base font-medium">Inventario general</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock actual</TableHead>
                <TableHead>Stock mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const estado =
                  p.stockActual === 0
                    ? "Vencido"
                    : p.stockActual < p.stockMinimo
                    ? "Bajo stock"
                    : "OK";
                const color =
                  estado === "OK"
                    ? "text-green-600 bg-green-50"
                    : estado === "Bajo stock"
                    ? "text-orange-600 bg-orange-50"
                    : "text-red-600 bg-red-50";

                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>{p.stockActual}</TableCell>
                    <TableCell>{p.stockMinimo}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${color}`}
                      >
                        {estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(p.vencimiento).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>{p.proveedor}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetail(p)}
                      >
                        Ver detalle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSelectedProduct(productos);
                            setOpenMovement(true);
                        }}
                    >
                        Registrar movimiento
                    </Button>
                    <MovementModal
                    open={openMovement}
                    onOpenChange={setOpenMovement}
                    product={selectedProduct}
                    onSave={(mov) => console.log("Movimiento registrado:", mov)}
                    />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtrados.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No se encontraron productos con ese criterio.
            </p>
          )}
        </CardContent>
      </Card>

      {/* --- Modal de detalle de producto --- */}
      <ProductDetailModal
        open={openModal}
        onOpenChange={setOpenModal}
        product={selectedProduct}
      />
    </div>
  );
}

// --- Componente auxiliar para cards ---
function ResumenCard({ title, value, icon }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
        <CardContent className="flex flex-col items-center justify-center p-5 gap-2">
          {icon}
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-semibold text-gray-800 text-center">
            {value}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
