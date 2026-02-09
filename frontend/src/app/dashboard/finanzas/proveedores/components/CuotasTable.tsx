"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { CuotaConProveedor } from "@/types/proveedores-financiero";
import PagarCuotaModal from "./PagarCuotaModal";

interface CuotasTableProps {
  cuotas: CuotaConProveedor[];
  isLoading: boolean;
  tipo: "vencidas" | "proximas";
  onPagarCuota: () => void;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CuotasTable({
  cuotas,
  isLoading,
  tipo,
  onPagarCuota,
}: CuotasTableProps) {
  const [pagarModalOpen, setPagarModalOpen] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<CuotaConProveedor | null>(
    null
  );

  const handlePagarCuota = (cuota: CuotaConProveedor) => {
    setSelectedCuota(cuota);
    setPagarModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cuotas.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="p-12 text-center">
          {tipo === "vencidas" ? (
            <>
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay cuotas vencidas</p>
              <p className="text-sm text-gray-400 mt-2">
                Todas las cuotas están al día
              </p>
            </>
          ) : (
            <>
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No hay cuotas próximas a vencer en los próximos 30 días
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Orden de Compra</TableHead>
                <TableHead>Cuota</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>
                  {tipo === "vencidas" ? "Días Vencida" : "Días para Vencer"}
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuotas.map((cuota) => (
                <TableRow key={cuota.id}>
                  <TableCell className="font-medium">
                    {cuota.proveedor.nombre}
                  </TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">
                    #{cuota.ordenCompraId.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Cuota {cuota.numeroCuota}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoney(cuota.monto)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatDate(cuota.fechaVencimiento)}
                  </TableCell>
                  <TableCell>
                    {tipo === "vencidas" ? (
                      <Badge
                        variant="destructive"
                        className="bg-red-100 text-red-700"
                      >
                        {cuota.diasVencida} días
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          (cuota.diasParaVencer || 0) <= 7
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {cuota.diasParaVencer} días
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePagarCuota(cuota)}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Pagar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
        <span>
          {cuotas.length} cuota{cuotas.length !== 1 && "s"}{" "}
          {tipo === "vencidas" ? "vencidas" : "próximas a vencer"}
        </span>
        <span>
          Total:{" "}
          <span className="font-semibold text-gray-700">
            {formatMoney(cuotas.reduce((sum, c) => sum + c.monto, 0))}
          </span>
        </span>
      </div>

      {/* Modal para pagar cuota */}
      <PagarCuotaModal
        open={pagarModalOpen}
        onOpenChange={setPagarModalOpen}
        cuota={selectedCuota}
        onSuccess={() => {
          onPagarCuota();
          setPagarModalOpen(false);
        }}
      />
    </>
  );
}
