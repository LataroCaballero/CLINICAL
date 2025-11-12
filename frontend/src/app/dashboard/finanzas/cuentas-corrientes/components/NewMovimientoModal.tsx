"use client";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";

export default function NewMovimientoModal({ open, onOpenChange, onSave }: any) {
  const [form, setForm] = useState({
    tipo: "Pago",
    monto: "",
    metodo: "",
    descripcion: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!form.monto || Number(form.monto) === 0) return;
    const nuevoMovimiento = {
      id: Math.random(),
      fecha: new Date().toLocaleDateString("es-AR"),
      tipo: form.tipo,
      descripcion: form.descripcion || (form.tipo === "Pago" ? "Pago registrado" : "Cargo registrado"),
      monto: form.tipo === "Pago" ? Number(form.monto) : -Number(form.monto),
      metodo: form.metodo,
    };
    onSave(nuevoMovimiento);
    onOpenChange(false);
    setForm({ tipo: "Pago", monto: "", metodo: "", descripcion: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Añadí un pago o un cargo manual a la cuenta corriente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Tipo de movimiento</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Cargo">Cargo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Monto</Label>
            <Input
              type="number"
              name="monto"
              value={form.monto}
              onChange={handleChange}
              placeholder="Ej: 15000"
            />
          </div>

          {form.tipo === "Pago" && (
            <div>
              <Label>Método de pago</Label>
              <Select
                value={form.metodo}
                onValueChange={(v) => setForm({ ...form, metodo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Descripción</Label>
            <Input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Pago por sesión de control"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={handleSave}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
