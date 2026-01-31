"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreatePago } from "@/hooks/useFinanzas";
import { MedioPago } from "@/types/finanzas";

interface RegistrarPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string | null;
  onSuccess?: () => void;
}

const MEDIOS_PAGO = [
  { value: MedioPago.EFECTIVO, label: "Efectivo" },
  { value: MedioPago.TRANSFERENCIA, label: "Transferencia" },
  { value: MedioPago.TARJETA_DEBITO, label: "Tarjeta de Débito" },
  { value: MedioPago.TARJETA_CREDITO, label: "Tarjeta de Crédito" },
  { value: MedioPago.MERCADO_PAGO, label: "Mercado Pago" },
  { value: MedioPago.OTRO, label: "Otro" },
];

export default function RegistrarPagoModal({
  open,
  onOpenChange,
  pacienteId,
  onSuccess,
}: RegistrarPagoModalProps) {
  const [form, setForm] = useState({
    monto: "",
    medioPago: MedioPago.EFECTIVO as MedioPago,
    descripcion: "",
    referencia: "",
  });

  const createPago = useCreatePago();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!pacienteId) {
      toast.error("No se seleccionó un paciente");
      return;
    }

    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    try {
      await createPago.mutateAsync({
        pacienteId,
        monto,
        medioPago: form.medioPago,
        descripcion: form.descripcion || undefined,
        referencia: form.referencia || undefined,
      });

      toast.success("Pago registrado correctamente");
      setForm({
        monto: "",
        medioPago: MedioPago.EFECTIVO,
        descripcion: "",
        referencia: "",
      });
      onSuccess?.();
    } catch (error) {
      toast.error("Error al registrar el pago");
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!createPago.isPending) {
      onOpenChange(false);
      setForm({
        monto: "",
        medioPago: MedioPago.EFECTIVO,
        descripcion: "",
        referencia: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Registra un pago en la cuenta corriente del paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="monto">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="monto"
                type="number"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                placeholder="0"
                className="pl-7"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="medioPago">Medio de Pago *</Label>
            <Select
              value={form.medioPago}
              onValueChange={(v) => setForm({ ...form, medioPago: v as MedioPago })}
            >
              <SelectTrigger id="medioPago">
                <SelectValue placeholder="Seleccionar medio" />
              </SelectTrigger>
              <SelectContent>
                {MEDIOS_PAGO.map((medio) => (
                  <SelectItem key={medio.value} value={medio.value}>
                    {medio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referencia">
              Referencia / Nº Comprobante
            </Label>
            <Input
              id="referencia"
              name="referencia"
              value={form.referencia}
              onChange={handleChange}
              placeholder="Ej: Transferencia #12345"
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Pago parcial tratamiento facial"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createPago.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createPago.isPending || !form.monto}
          >
            {createPago.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Registrar Pago"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
