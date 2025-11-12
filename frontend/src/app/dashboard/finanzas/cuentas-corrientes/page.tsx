"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import NewMovimientoModal from "./components/NewMovimientoModal";

export default function CuentasCorrientesPage() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);

  const pacientes = [
    { id: 1, nombre: "Lautaro Caballero", saldo: 25000 },
    { id: 2, nombre: "Federico García", saldo: -12000 },
    { id: 3, nombre: "Ana Pérez", saldo: 0 },
    { id: 4, nombre: "Carlos Gómez", saldo: 34000 },
  ];

  const movimientosMock = [
    { id: 1, fecha: "02/11/2025", tipo: "Pago", descripcion: "Pago por tratamiento facial", monto: 20000 },
    { id: 2, fecha: "05/11/2025", tipo: "Cargo", descripcion: "Nuevo tratamiento corporal", monto: -15000 },
    { id: 3, fecha: "09/11/2025", tipo: "Pago", descripcion: "Pago parcial", monto: 10000 },
  ];

  const handleOpen = (paciente: any) => {
    setSelectedPatient(paciente);
    setOpenDrawer(true);
  };

  const [openModal, setOpenModal] = useState(false);
  const [movimientos, setMovimientos] = useState(movimientosMock);

  const handleAddMovimiento = (nuevo: any) => {
    setMovimientos((prev) => [nuevo, ...prev]);
    // actualiza el saldo del paciente
    if (selectedPatient) {
      selectedPatient.saldo += nuevo.monto;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Cuentas Corrientes</h1>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar paciente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de pacientes */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-700">Listado de pacientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[420px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="text-left py-3 px-4">Paciente</th>
                  <th className="text-left py-3 px-4">Saldo actual</th>
                  <th className="text-right py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes
                  .filter((p) =>
                    p.nombre.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4">{p.nombre}</td>
                      <td
                        className={`py-3 px-4 font-medium ${
                          p.saldo > 0
                            ? "text-green-600"
                            : p.saldo < 0
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        ${p.saldo.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpen(p)}
                        >
                          Ver movimientos
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Drawer de detalle */}
      <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
        <DrawerContent className="max-w-md ml-auto">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold">
              {selectedPatient?.nombre}
            </DrawerTitle>
            <DrawerDescription>
              Saldo actual:{" "}
              <span
                className={`font-medium ${
                  selectedPatient?.saldo > 0
                    ? "text-green-600"
                    : selectedPatient?.saldo < 0
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                ${selectedPatient?.saldo?.toLocaleString("es-AR")}
              </span>
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="h-[60vh] px-4">
            {movimientosMock.map((mov) => (
              <div
                key={mov.id}
                className="flex items-start justify-between border-b py-3"
              >
                <div>
                  <p className="text-sm text-gray-700 font-medium">
                    {mov.descripcion}
                  </p>
                  <p className="text-xs text-gray-500">{mov.fecha}</p>
                </div>
                <div
                  className={`text-sm font-semibold flex items-center gap-1 ${
                    mov.monto > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {mov.monto > 0 ? (
                    <ArrowUpCircle className="w-4 h-4" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4" />
                  )}
                  ${Math.abs(mov.monto).toLocaleString("es-AR")}
                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Registrar nuevo movimiento */}
          <div className="border-t bg-gray-50 p-4 flex justify-between items-center">
          <Button variant="outline" onClick={() => setOpenModal(true)}>
            Registrar movimiento
          </Button>
          <NewMovimientoModal
            open={openModal}
            onOpenChange={setOpenModal}
            onSave={handleAddMovimiento}
          />
            <DrawerClose asChild>
              <Button variant="secondary">Cerrar</Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
