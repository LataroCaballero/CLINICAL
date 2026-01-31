"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusCircle,
  Trash2,
  CreditCard,
  Search,
  Loader2,
  AlertTriangle,
  Receipt,
  History,
  ShoppingCart,
  Banknote,
  Smartphone,
  Building2,
  DollarSign,
  Calendar,
  User,
  Filter,
  X,
} from "lucide-react";
import { useInventario } from "@/hooks/useInventario";
import { useVentasProducto, useCreateVentaProducto, useResumenVentas } from "@/hooks/useVentasProducto";
import { usePacientes } from "@/hooks/usePacientes";
import { Inventario, VentaProducto } from "@/types/stock";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface VentaItem {
  productoId: string;
  nombre: string;
  precio: number;
  stock: number;
  cantidad: number;
}

const MEDIOS_PAGO = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "tarjeta_debito", label: "Tarjeta Débito", icon: CreditCard },
  { value: "tarjeta_credito", label: "Tarjeta Crédito", icon: CreditCard },
  { value: "transferencia", label: "Transferencia", icon: Building2 },
  { value: "mercado_pago", label: "Mercado Pago", icon: Smartphone },
  { value: "cuenta_corriente", label: "Cuenta Corriente", icon: Receipt },
];

export default function VentasPage() {
  const [activeTab, setActiveTab] = useState("nueva");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Ventas de Productos</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="nueva" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Nueva Venta
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nueva" className="mt-6">
          <NuevaVentaTab />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <HistorialVentasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== TAB NUEVA VENTA ==========
function NuevaVentaTab() {
  const { data: inventario, isLoading, error } = useInventario();
  const { data: pacientes } = usePacientes();
  const { data: resumenHoy } = useResumenVentas(
    startOfDay(new Date()).toISOString(),
    endOfDay(new Date()).toISOString()
  );
  const createVenta = useCreateVentaProducto();

  const [busqueda, setBusqueda] = useState("");
  const [venta, setVenta] = useState<VentaItem[]>([]);
  const [pacienteId, setPacienteId] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [descuento, setDescuento] = useState<number>(0);
  const [observaciones, setObservaciones] = useState("");

  // Filter products available for sale
  const productosDisponibles = inventario?.filter(
    (inv) =>
      inv.producto.tipo === "PRODUCTO_VENTA" &&
      inv.stockActual > 0 &&
      (inv.producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        inv.producto.sku?.toLowerCase().includes(busqueda.toLowerCase()))
  ) ?? [];

  const agregarProducto = (inv: Inventario) => {
    if (venta.find((v) => v.productoId === inv.productoId)) {
      // Si ya existe, incrementar cantidad
      cambiarCantidad(inv.productoId, (venta.find(v => v.productoId === inv.productoId)?.cantidad ?? 0) + 1);
      return;
    }
    setVenta((prev) => [
      ...prev,
      {
        productoId: inv.productoId,
        nombre: inv.producto.nombre,
        precio: Number(inv.precioActual) || Number(inv.producto.precioSugerido) || 0,
        stock: inv.stockActual,
        cantidad: 1,
      },
    ]);
  };

  const cambiarCantidad = (productoId: string, cantidad: number) => {
    setVenta((prev) =>
      prev.map((v) => {
        if (v.productoId === productoId) {
          const nuevaCantidad = Math.max(1, Math.min(cantidad, v.stock));
          return { ...v, cantidad: nuevaCantidad };
        }
        return v;
      })
    );
  };

  const eliminarProducto = (productoId: string) => {
    setVenta((prev) => prev.filter((v) => v.productoId !== productoId));
  };

  const limpiarVenta = () => {
    setVenta([]);
    setDescuento(0);
    setPacienteId("");
    setObservaciones("");
    setBusqueda("");
  };

  const subtotal = venta.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoCalculado = subtotal * (descuento / 100);
  const total = subtotal - descuentoCalculado;

  const registrarVenta = async () => {
    if (venta.length === 0) {
      toast.error("Agrega al menos un producto a la venta");
      return;
    }

    try {
      await createVenta.mutateAsync({
        pacienteId: pacienteId || undefined,
        medioPago: metodoPago,
        descuento: descuento > 0 ? descuento : undefined,
        items: venta.map((v) => ({
          productoId: v.productoId,
          cantidad: v.cantidad,
          precioUnitario: v.precio,
        })),
      });

      toast.success("Venta registrada correctamente", {
        description: `Total: $${total.toLocaleString("es-AR")}`,
      });
      limpiarVenta();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al registrar la venta");
    }
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

  const MedioPagoIcon = MEDIOS_PAGO.find(m => m.value === metodoPago)?.icon ?? CreditCard;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel izquierdo: Selección de productos */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              Buscar productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {productosDisponibles.slice(0, 12).map((inv) => {
                const enCarrito = venta.some((v) => v.productoId === inv.productoId);
                return (
                  <Button
                    key={inv.id}
                    variant={enCarrito ? "default" : "outline"}
                    onClick={() => agregarProducto(inv)}
                    className={`flex flex-col items-start h-auto py-2 px-3 text-left ${
                      enCarrito ? "bg-indigo-600 hover:bg-indigo-700" : ""
                    }`}
                  >
                    <span className="font-medium text-sm truncate w-full">
                      {inv.producto.nombre}
                    </span>
                    <span className={`text-xs ${enCarrito ? "text-indigo-200" : "text-gray-500"}`}>
                      ${Number(inv.precioActual || inv.producto.precioSugerido || 0).toLocaleString("es-AR")} · Stock: {inv.stockActual}
                    </span>
                  </Button>
                );
              })}
            </div>

            {productosDisponibles.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-4">
                {busqueda ? "No se encontraron productos" : "No hay productos de venta disponibles"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Carrito */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Carrito ({venta.length} {venta.length === 1 ? "producto" : "productos"})
              </CardTitle>
              {venta.length > 0 && (
                <Button variant="ghost" size="sm" onClick={limpiarVenta}>
                  <X className="w-4 h-4 mr-1" /> Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {venta.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Agrega productos para comenzar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-24 text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venta.map((p) => (
                    <TableRow key={p.productoId}>
                      <TableCell>
                        <p className="font-medium">{p.nombre}</p>
                        <p className="text-xs text-gray-500">Stock: {p.stock}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => cambiarCantidad(p.productoId, p.cantidad - 1)}
                            disabled={p.cantidad <= 1}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={p.cantidad}
                            min={1}
                            max={p.stock}
                            onChange={(e) => cambiarCantidad(p.productoId, Number(e.target.value))}
                            className="w-14 h-7 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => cambiarCantidad(p.productoId, p.cantidad + 1)}
                            disabled={p.cantidad >= p.stock}
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${p.precio.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(p.precio * p.cantidad).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => eliminarProducto(p.productoId)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel derecho: Resumen y pago */}
      <div className="space-y-4">
        {/* Resumen del día */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-indigo-600">Ventas de hoy</p>
                <p className="text-xl font-bold text-indigo-700">
                  ${(resumenHoy?.totalVentas ?? 0).toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-indigo-500">
                  {resumenHoy?.cantidadVentas ?? 0} ventas realizadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos de la venta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Datos de la venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" /> Paciente (opcional)
              </Label>
              <Select
                value={pacienteId || "_none"}
                onValueChange={(v) => setPacienteId(v === "_none" ? "" : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Venta libre (sin paciente)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Venta libre</SelectItem>
                  {pacientes?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <MedioPagoIcon className="w-4 h-4" /> Medio de pago
              </Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <m.icon className="w-4 h-4" />
                        {m.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales..."
                className="mt-1"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>${subtotal.toLocaleString("es-AR")}</span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600 whitespace-nowrap">Descuento %</Label>
              <Input
                type="number"
                value={descuento}
                min={0}
                max={100}
                onChange={(e) => setDescuento(Number(e.target.value))}
                className="w-20 h-8"
              />
              {descuento > 0 && (
                <span className="text-green-600 text-sm">
                  -${descuentoCalculado.toLocaleString("es-AR")}
                </span>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${total.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
              size="lg"
              onClick={registrarVenta}
              disabled={venta.length === 0 || createVenta.isPending}
            >
              {createVenta.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="mr-2 h-4 w-4" />
              )}
              Registrar Venta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========== TAB HISTORIAL ==========
function HistorialVentasTab() {
  const [filtroDesde, setFiltroDesde] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [filtroHasta, setFiltroHasta] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [filtroPaciente, setFiltroPaciente] = useState<string>("");

  const { data: ventas, isLoading } = useVentasProducto({
    desde: filtroDesde ? new Date(filtroDesde).toISOString() : undefined,
    hasta: filtroHasta ? new Date(filtroHasta + "T23:59:59").toISOString() : undefined,
    pacienteId: filtroPaciente || undefined,
  });
  const { data: pacientes } = usePacientes();
  const { data: resumen } = useResumenVentas(
    filtroDesde ? new Date(filtroDesde).toISOString() : undefined,
    filtroHasta ? new Date(filtroHasta + "T23:59:59").toISOString() : undefined
  );

  const getMedioPagoLabel = (medio: string) => {
    return MEDIOS_PAGO.find(m => m.value === medio)?.label ?? medio;
  };

  const getMedioPagoIcon = (medio: string) => {
    const Icon = MEDIOS_PAGO.find(m => m.value === medio)?.icon ?? CreditCard;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Desde
              </Label>
              <Input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Hasta
              </Label>
              <Input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" /> Paciente
              </Label>
              <Select
                value={filtroPaciente || "_all"}
                onValueChange={(v) => setFiltroPaciente(v === "_all" ? "" : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos los pacientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  {pacientes?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">Total vendido</p>
                <p className="text-2xl font-bold text-green-700">
                  ${(resumen?.totalVentas ?? 0).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Cantidad de ventas</p>
                <p className="text-2xl font-bold text-blue-700">
                  {resumen?.cantidadVentas ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600">Promedio por venta</p>
                <p className="text-2xl font-bold text-purple-700">
                  ${((resumen?.totalVentas ?? 0) / Math.max(resumen?.cantidadVentas ?? 1, 1)).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Historial de ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : ventas && ventas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Medio de pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(venta.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {venta.paciente?.nombreCompleto ?? (
                          <span className="text-gray-400 italic">Venta libre</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {venta.items.slice(0, 3).map((item) => (
                            <Badge key={item.id} variant="secondary" className="text-xs">
                              {item.producto?.nombre} x{item.cantidad}
                            </Badge>
                          ))}
                          {venta.items.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{venta.items.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMedioPagoIcon(venta.medioPago)}
                          <span className="text-sm">{getMedioPagoLabel(venta.medioPago)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(venta.total).toLocaleString("es-AR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No hay ventas en el período seleccionado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
