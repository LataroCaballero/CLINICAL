"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

export default function LiquidacionDetailModal({ open, onOpenChange, liquidacion }: any) {
  const [totalGenerado, setTotalGenerado] = useState(0);
  const [montoFacturar, setMontoFacturar] = useState("");
  const [montoNoFacturado, setMontoNoFacturado] = useState("");
  const [metodo, setMetodo] = useState("");

  useEffect(() => {
    if (liquidacion) {
      setTotalGenerado(liquidacion.total || 0);
      setMontoFacturar(liquidacion.total ? liquidacion.total.toString() : "");
      setMontoNoFacturado("0");
    }
  }, [liquidacion]);

  const handleMontoChange = (value: string) => {
    const fact = parseFloat(value) || 0;
    const noFact = Math.max(totalGenerado - fact, 0);
    setMontoFacturar(value);
    setMontoNoFacturado(noFact.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de Facturación Mensual</DialogTitle>
          <DialogDescription>
            Facturación generada por entidad durante el mes actual. Definí el monto a facturar y el método correspondiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entidad / Obra Social</Label>
              <Input value={liquidacion?.entidad || "OSDE"} readOnly />
            </div>

            <div>
              <Label>Periodo</Label>
              <Input value={liquidacion?.periodo || "Noviembre 2025"} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total generado</Label>
              <Input value={`$${totalGenerado.toLocaleString("es-AR")}`} readOnly />
            </div>

            <div>
              <Label>Monto a facturar</Label>
              <Input
                type="number"
                value={montoFacturar}
                onChange={(e) => handleMontoChange(e.target.value)}
                min={0}
                max={totalGenerado}
              />
            </div>
          </div>

          <div>
            <Label>Monto no facturado</Label>
            <Input value={`$${parseFloat(montoNoFacturado || "0").toLocaleString("es-AR")}`} readOnly />
          </div>

          <div>
            <Label>Método de liquidación</Label>
            <Select onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-700 mb-2">Datos fiscales simulados</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Input value="CUIT: 30-12345678-9" readOnly />
              <Input value="IVA: Responsable Inscripto" readOnly />
              <Input value="Domicilio: Av. Salud 123" readOnly className="col-span-2" />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
              Generar comprobante
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
