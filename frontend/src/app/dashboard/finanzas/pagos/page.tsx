"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Wallet, CreditCard, Banknote, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PaymentDetailModal from "./components/PaymentDetailModal";


export default function PagosPage() {
  const [filtro, setFiltro] = useState({
    metodo: "todos",
    fecha: "",
  });

  const pagos = [
    {
      id: 1,
      fecha: new Date(2025, 10, 10),
      paciente: "Lautaro Caballero",
      metodo: "Efectivo",
      monto: 20000,
    },
    {
      id: 2,
      fecha: new Date(2025, 10, 11),
      paciente: "Romina González",
      metodo: "Transferencia",
      monto: 45000,
    },
    {
      id: 3,
      fecha: new Date(2025, 10, 11),
      paciente: "Eduardo Díaz",
      metodo: "Tarjeta",
      monto: 30000,
    },
  ];

  const filtrados = pagos.filter((p) => {
    const matchMetodo =
      filtro.metodo === "todos" ||
      p.metodo.toLowerCase() === filtro.metodo.toLowerCase();
    const matchFecha =
      !filtro.fecha ||
      format(p.fecha, "yyyy-MM-dd") === filtro.fecha;
    return matchMetodo && matchFecha;
  });

  const totalPagos = filtrados.reduce((acc, p) => acc + p.monto, 0);

  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Gestión de Pagos</h1>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Fecha</label>
            <Input
              type="date"
              value={filtro.fecha}
              onChange={(e) =>
                setFiltro((prev) => ({ ...prev, fecha: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Método de pago</label>
            <Select
              value={filtro.metodo}
              onValueChange={(v) => setFiltro((p) => ({ ...p, metodo: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-end">
            <Button className="bg-indigo-600 text-white flex gap-2">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Pagos registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {format(p.fecha, "dd 'de' MMMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{p.paciente}</TableCell>
                  <TableCell>
                    {p.metodo === "Efectivo" && (
                      <Banknote className="inline-block w-4 h-4 mr-1 text-green-500" />
                    )}
                    {p.metodo === "Transferencia" && (
                      <Wallet className="inline-block w-4 h-4 mr-1 text-blue-500" />
                    )}
                    {p.metodo === "Tarjeta" && (
                      <CreditCard className="inline-block w-4 h-4 mr-1 text-purple-500" />
                    )}
                    {p.metodo}
                  </TableCell>
                  <TableCell>${p.monto.toLocaleString("es-AR")}</TableCell>
                  <TableCell>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex gap-1"
                        onClick={() => {
                            setSelectedPayment(p);
                            setOpenModal(true);
                        }}
                        >
                    <FileText className="w-4 h-4" /> Ver detalle
                    </Button>
                    <PaymentDetailModal
                        open={openModal}
                        onOpenChange={setOpenModal}
                        payment={selectedPayment}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtrados.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No hay pagos registrados para los filtros seleccionados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Totales */}
      <div className="flex justify-end pr-4">
        <p className="text-sm text-gray-700">
          <strong>Total del período: </strong>
          <span className="text-green-600 font-semibold">
            ${totalPagos.toLocaleString("es-AR")}
          </span>
        </p>
      </div>
    </div>
  );
}
