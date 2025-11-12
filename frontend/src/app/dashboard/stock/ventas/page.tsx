"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PlusCircle, Trash2, CreditCard, Search } from "lucide-react";

export default function RegistrarVentaPage() {
  const [productos] = useState([
    { id: 1, nombre: "Crema Regeneradora", precio: 8500, stock: 12 },
    { id: 2, nombre: "Suplemento Colágeno", precio: 12500, stock: 7 },
    { id: 3, nombre: "Mascarilla Hidratante", precio: 3000, stock: 20 },
    { id: 4, nombre: "Serum Facial Antiedad", precio: 9600, stock: 15 },
    { id: 5, nombre: "Loción Exfoliante", precio: 7200, stock: 10 },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [venta, setVenta] = useState<any[]>([]);
  const [paciente, setPaciente] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [descuento, setDescuento] = useState<number>(0);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarProducto = (p: any) => {
    if (venta.find((v) => v.id === p.id)) return;
    setVenta((prev) => [...prev, { ...p, cantidad: 1 }]);
  };

  const cambiarCantidad = (id: number, cantidad: number) => {
    setVenta((prev) =>
      prev.map((v) => (v.id === id ? { ...v, cantidad: Math.max(1, cantidad) } : v))
    );
  };

  const eliminarProducto = (id: number) => {
    setVenta((prev) => prev.filter((v) => v.id !== id));
  };

  const subtotal = venta.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoCalculado = subtotal * (descuento / 100);
  const total = subtotal - descuentoCalculado;

  const registrarVenta = () => {
    const nuevaVenta = {
      id: Math.random(),
      paciente: paciente || "Venta libre",
      productos: venta,
      metodoPago,
      descuento,
      total,
      fecha: new Date(),
    };
    console.log("Venta registrada:", nuevaVenta);
    alert("Venta registrada correctamente ✅");
    setVenta([]);
    setDescuento(0);
    setPaciente("");
    setBusqueda("");
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-gray-800">Registrar venta</h1>

      <Card className="p-4 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-700">
            Información de la venta
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Paciente + método de pago */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Paciente (opcional)</Label>
              <Input
                placeholder="Buscar o escribir nombre del paciente"
                value={paciente}
                onChange={(e) => setPaciente(e.target.value)}
              />
            </div>
            <div className="w-full md:w-60">
              <Label>Método de pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buscar productos */}
          <div className="border rounded-md p-4">
            <Label className="text-gray-700 font-medium mb-2 block">
              Seleccionar productos
            </Label>

            <div className="flex flex-col md:flex-row gap-3 mb-4 items-center">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar producto..."
                  className="pl-9"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {/* Botones de productos */}
            <div className="flex flex-wrap gap-2 mb-4">
              {productosFiltrados.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  onClick={() => agregarProducto(p)}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> {p.nombre}
                </Button>
              ))}
              {productosFiltrados.length === 0 && (
                <p className="text-sm text-gray-500 italic mt-2">
                  No se encontraron productos.
                </p>
              )}
            </div>

            {/* Tabla de productos agregados */}
            {venta.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venta.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.nombre}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={p.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(p.id, Number(e.target.value))
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>${p.precio.toLocaleString("es-AR")}</TableCell>
                      <TableCell>
                        ${(p.precio * p.cantidad).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarProducto(p.id)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Totales */}
          <div className="flex flex-col md:flex-row justify-end gap-4 pt-4 border-t">
            <div className="flex flex-col gap-2 w-full md:w-60">
              <Label>Descuento (%)</Label>
              <Input
                type="number"
                value={descuento}
                onChange={(e) => setDescuento(Number(e.target.value))}
                placeholder="Ej: 10"
              />
            </div>
            <div className="text-right md:text-left">
              <p className="text-sm text-gray-600">Subtotal:</p>
              <p className="text-lg font-semibold">
                ${subtotal.toLocaleString("es-AR")}
              </p>
              <p className="text-sm text-gray-600">Descuento aplicado:</p>
              <p className="text-lg text-gray-700">
                -${descuentoCalculado.toLocaleString("es-AR")}
              </p>
              <p className="text-sm text-gray-600">Total a pagar:</p>
              <p className="text-2xl font-bold text-indigo-600">
                ${total.toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end mt-4 border-t pt-3">
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            onClick={registrarVenta}
            disabled={venta.length === 0}
          >
            <CreditCard className="w-4 h-4" /> Registrar venta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
