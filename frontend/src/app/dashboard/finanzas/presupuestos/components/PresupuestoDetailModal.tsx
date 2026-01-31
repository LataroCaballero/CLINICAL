"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Send, Check, X } from "lucide-react";
import { usePresupuestoDetalle, useUpdatePresupuestoEstado } from "@/hooks/useFinanzas";
import { EstadoPresupuesto } from "@/types/finanzas";
import { toast } from "sonner";

interface PresupuestoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuestoId: string | null;
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
    month: "long",
    year: "numeric",
  });
}

const ESTADO_BADGES: Record<
  EstadoPresupuesto,
  { label: string; className: string }
> = {
  [EstadoPresupuesto.BORRADOR]: {
    label: "Borrador",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  [EstadoPresupuesto.ENVIADO]: {
    label: "Enviado",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [EstadoPresupuesto.ACEPTADO]: {
    label: "Aceptado",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [EstadoPresupuesto.RECHAZADO]: {
    label: "Rechazado",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [EstadoPresupuesto.CANCELADO]: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export default function PresupuestoDetailModal({
  open,
  onOpenChange,
  presupuestoId,
}: PresupuestoDetailModalProps) {
  const { data: presupuesto, isLoading, refetch } = usePresupuestoDetalle(
    presupuestoId || undefined
  );
  const updateEstado = useUpdatePresupuestoEstado();

  const handleAceptar = async () => {
    if (!presupuestoId) return;
    try {
      await updateEstado.mutateAsync({
        presupuestoId,
        estado: EstadoPresupuesto.ACEPTADO,
      });
      toast.success("Presupuesto aceptado. Se creó el cargo en cuenta corriente.");
      refetch();
    } catch (error) {
      toast.error("Error al aceptar el presupuesto");
    }
  };

  const handleRechazar = async () => {
    if (!presupuestoId) return;
    try {
      await updateEstado.mutateAsync({
        presupuestoId,
        estado: EstadoPresupuesto.RECHAZADO,
      });
      toast.success("Presupuesto rechazado");
      refetch();
    } catch (error) {
      toast.error("Error al rechazar el presupuesto");
    }
  };

  const canModify =
    presupuesto?.estado === EstadoPresupuesto.BORRADOR ||
    presupuesto?.estado === EstadoPresupuesto.ENVIADO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalle del Presupuesto</span>
            {presupuesto && (
              <Badge
                variant="outline"
                className={ESTADO_BADGES[presupuesto.estado].className}
              >
                {ESTADO_BADGES[presupuesto.estado].label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : presupuesto ? (
          <div className="space-y-6 py-2">
            {/* Info del paciente */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Paciente</p>
                <p className="font-medium">{presupuesto.paciente?.nombreCompleto}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-medium">{formatDate(presupuesto.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Obra Social</p>
                <p className="font-medium">
                  {presupuesto.paciente?.obraSocial?.nombre || "Particular"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Profesional</p>
                <p className="font-medium">
                  {presupuesto.profesional?.usuario?.nombre}{" "}
                  {presupuesto.profesional?.usuario?.apellido}
                </p>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presupuesto.items?.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{item.descripcion}</TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.precioUnitario)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Totales */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatMoney(presupuesto.subtotal)}</span>
              </div>
              {presupuesto.descuentos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Descuentos</span>
                  <span className="text-red-600">
                    -{formatMoney(presupuesto.descuentos)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatMoney(presupuesto.total)}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                {canModify && (
                  <Button variant="outline" size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                )}
              </div>
              {canModify && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRechazar}
                    disabled={updateEstado.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleAceptar}
                    disabled={updateEstado.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aceptar
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No se encontró el presupuesto
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
