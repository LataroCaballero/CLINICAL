"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Banknote, Wallet } from "lucide-react";

export default function PaymentDetailModal({ open, onOpenChange, payment }: any) {
  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalle del Pago</DialogTitle>
          <DialogDescription>
            Información completa sobre el pago realizado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Paciente</Label>
            <Input value={payment.paciente} readOnly />
          </div>

          <div>
            <Label>Fecha</Label>
            <Input
              value={format(payment.fecha, "dd 'de' MMMM yyyy", { locale: es })}
              readOnly
            />
          </div>

          <div>
            <Label>Monto</Label>
            <Input
              value={`$${payment.monto.toLocaleString("es-AR")}`}
              readOnly
            />
          </div>

          <div>
            <Label>Método de pago</Label>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-gray-50 text-sm">
              {payment.metodo === "Efectivo" && (
                <Banknote className="w-4 h-4 text-green-500" />
              )}
              {payment.metodo === "Transferencia" && (
                <Wallet className="w-4 h-4 text-blue-500" />
              )}
              {payment.metodo === "Tarjeta" && (
                <CreditCard className="w-4 h-4 text-purple-500" />
              )}
              {payment.metodo}
            </div>
          </div>

          <div className="col-span-2">
            <Label>Observaciones</Label>
            <Input
              placeholder="Sin observaciones"
              value={payment.observaciones || ""}
              readOnly
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
