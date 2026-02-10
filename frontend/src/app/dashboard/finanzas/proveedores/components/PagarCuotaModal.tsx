"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { usePagarCuota } from "@/hooks/useCuentasCorrientesProveedores";
import { CuotaConProveedor, MedioPago } from "@/types/proveedores-financiero";
import { toast } from "sonner";

interface PagarCuotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuota: CuotaConProveedor | null;
  onSuccess: () => void;
}

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA_DEBITO", label: "Tarjeta de Débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta de Crédito" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "OTRO", label: "Otro" },
];

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

export default function PagarCuotaModal({
  open,
  onOpenChange,
  cuota,
  onSuccess,
}: PagarCuotaModalProps) {
  const [medioPago, setMedioPago] = useState<MedioPago>("TRANSFERENCIA");
  const [referencia, setReferencia] = useState("");

  const pagarCuota = usePagarCuota();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cuota) return;

    try {
      await pagarCuota.mutateAsync({
        cuotaId: cuota.id,
        data: {
          medioPago,
          referencia: referencia || undefined,
        },
      });
      toast.success("Cuota pagada correctamente");
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error("Error al pagar la cuota");
    }
  };

  const resetForm = () => {
    setMedioPago("TRANSFERENCIA");
    setReferencia("");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  if (!cuota) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pagar Cuota</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Info de la cuota */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Proveedor</span>
              <span className="font-medium">{cuota.proveedor.nombre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Orden</span>
              <span className="font-mono text-sm">
                #{cuota.ordenCompraId.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Cuota</span>
              <Badge variant="outline">N° {cuota.numeroCuota}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Vencimiento</span>
              <span>{formatDate(cuota.fechaVencimiento)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Monto a pagar</span>
              <span className="text-xl font-bold text-emerald-600">
                {formatMoney(cuota.monto)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medioPago">Medio de Pago *</Label>
              <Select
                value={medioPago}
                onValueChange={(v) => setMedioPago(v as MedioPago)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medio de pago" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((mp) => (
                    <SelectItem key={mp.value} value={mp.value}>
                      {mp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia / Comprobante</Label>
              <Input
                id="referencia"
                placeholder="N° transferencia, recibo, etc."
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pagarCuota.isPending}>
                {pagarCuota.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Confirmar Pago
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
