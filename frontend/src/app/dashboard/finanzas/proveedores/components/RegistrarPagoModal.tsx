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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useRegistrarPagoProveedor } from "@/hooks/useCuentasCorrientesProveedores";
import { MedioPago } from "@/types/proveedores-financiero";
import { toast } from "sonner";

interface RegistrarPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorId: string | null;
  proveedorNombre: string | null;
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

export default function RegistrarPagoModal({
  open,
  onOpenChange,
  proveedorId,
  proveedorNombre,
  onSuccess,
}: RegistrarPagoModalProps) {
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("TRANSFERENCIA");
  const [descripcion, setDescripcion] = useState("");
  const [referencia, setReferencia] = useState("");

  const registrarPago = useRegistrarPagoProveedor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proveedorId || !monto) return;

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("El monto debe ser un número positivo");
      return;
    }

    try {
      await registrarPago.mutateAsync({
        proveedorId,
        data: {
          monto: montoNum,
          medioPago,
          descripcion: descripcion || undefined,
          referencia: referencia || undefined,
        },
      });
      toast.success("Pago registrado correctamente");
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error("Error al registrar el pago");
    }
  };

  const resetForm = () => {
    setMonto("");
    setMedioPago("TRANSFERENCIA");
    setDescripcion("");
    setReferencia("");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
          {proveedorNombre && (
            <p className="text-sm text-gray-500">{proveedorNombre}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="monto">Monto *</Label>
            <Input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Notas adicionales..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
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
            <Button type="submit" disabled={registrarPago.isPending || !monto}>
              {registrarPago.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
