"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Package,
  PlusCircle,
  ShoppingCart,
  LayoutGrid,
  Loader2,
  Calendar,
} from "lucide-react";
import ProductDetailModal from "./components/ProductDetailModal";
import MovementModal from "./components/MovementModal";
import NewProductModal from "./components/NewProductModal";
import Link from "next/link";
import { useInventario, useAlertasStock, useProximosVencer } from "@/hooks/useInventario";
import { Inventario, Lote } from "@/types/stock";

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openMovement, setOpenMovement] = useState(false);
  const [openNewProduct, setOpenNewProduct] = useState(false);

  // Hooks de datos reales
  const { data: inventario, isLoading, error } = useInventario();
  const { data: alertas } = useAlertasStock();
  const { data: proximosVencer } = useProximosVencer(30);

  // Estadísticas
  const totalProductos = inventario?.length ?? 0;
  const bajosStock = alertas?.length ?? 0;
  const proximosAVencer = proximosVencer?.length ?? 0;

  // Filtrado por búsqueda
  const filtrados = inventario?.filter((inv) =>
    inv.producto.nombre.toLowerCase().includes(search.toLowerCase()) ||
    inv.producto.sku?.toLowerCase().includes(search.toLowerCase()) ||
    inv.producto.categoria?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleViewDetail = (inv: Inventario) => {
    setSelectedInventario(inv);
    setOpenModal(true);
  };

  const handleOpenMovement = (inv: Inventario) => {
    setSelectedInventario(inv);
    setOpenMovement(true);
  };

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
        <p className="text-red-600">Error al cargar el inventario</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Control de Stock</h1>

      {/* Cards de resumen */}
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
          highlight={bajosStock > 0}
        />
        <ResumenCard
          title="Próximos a vencer"
          value={proximosAVencer}
          icon={<Calendar className="w-6 h-6 text-red-500" />}
          highlight={proximosAVencer > 0}
        />
        <ResumenCard
          title="Último movimiento"
          value={getUltimoMovimiento(inventario)}
          icon={<PlusCircle className="w-6 h-6 text-green-500" />}
        />
      </div>

      {/* Barra de búsqueda y acciones */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-3">
        <Input
          placeholder="Buscar producto..."
          className="w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 justify-end">
          <Link href="/dashboard/stock/ventas">
            <Button variant="outline" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Registrar venta
            </Button>
          </Link>

          <Link href="/dashboard/stock/catalogo">
            <Button variant="outline" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Ver catálogo
            </Button>
          </Link>

          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
            onClick={() => setOpenNewProduct(true)}
          >
            <PlusCircle className="w-4 h-4" /> Agregar producto
          </Button>
        </div>
      </div>

      {/* Alerta de bajo stock */}
      {bajosStock > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span className="text-orange-700">
            Hay <strong>{bajosStock}</strong> producto(s) con stock bajo el mínimo configurado.
          </span>
        </div>
      )}

      {/* Tabla principal */}
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
                <TableHead>Precio</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((inv) => {
                const estado = getEstadoStock(inv);
                const color = getColorEstado(estado);
                const proveedor = inv.producto.proveedores?.[0]?.proveedor?.nombre ?? "-";

                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inv.producto.nombre}</p>
                        {inv.producto.sku && (
                          <p className="text-xs text-gray-500">SKU: {inv.producto.sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{inv.producto.categoria ?? "-"}</TableCell>
                    <TableCell className="font-medium">{inv.stockActual}</TableCell>
                    <TableCell>{inv.stockMinimo}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
                        {estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      {inv.precioActual
                        ? `$${Number(inv.precioActual).toLocaleString("es-AR")}`
                        : "-"}
                    </TableCell>
                    <TableCell>{proveedor}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(inv)}
                        >
                          Ver detalle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMovement(inv)}
                        >
                          Movimiento
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtrados.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              {search
                ? "No se encontraron productos con ese criterio."
                : "No hay productos en el inventario. Agrega uno para comenzar."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <ProductDetailModal
        open={openModal}
        onOpenChange={setOpenModal}
        inventario={selectedInventario}
      />

      <MovementModal
        open={openMovement}
        onOpenChange={setOpenMovement}
        inventario={selectedInventario}
      />

      <NewProductModal
        open={openNewProduct}
        onOpenChange={setOpenNewProduct}
      />
    </div>
  );
}

// Helpers
function getEstadoStock(inv: Inventario): string {
  if (inv.stockActual === 0) return "Sin stock";
  if (inv.stockActual < inv.stockMinimo) return "Bajo stock";
  return "OK";
}

function getColorEstado(estado: string): string {
  switch (estado) {
    case "OK":
      return "text-green-600 bg-green-50";
    case "Bajo stock":
      return "text-orange-600 bg-orange-50";
    case "Sin stock":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function getUltimoMovimiento(inventario?: Inventario[]): string {
  // TODO: obtener del backend
  return "Ver historial";
}

// Componente de card de resumen
function ResumenCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`border shadow-sm hover:shadow-md transition ${
          highlight ? "border-orange-300 bg-orange-50/50" : "border-gray-200"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center p-5 gap-2">
          {icon}
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-semibold text-gray-800 text-center">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
