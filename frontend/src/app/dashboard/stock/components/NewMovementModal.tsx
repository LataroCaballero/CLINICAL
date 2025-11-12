"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function NewMovementModal({ open, onOpenChange, type, onSave }: any) {
  const [fecha, setFecha] = useState<Date>(new Date());
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState(type || "ingreso");

  const handleSave = () => {
    if (!cantidad || cantidad <= 0) return alert("La cantidad debe ser mayor a 0");
    const nuevoMovimiento = {
      id: Math.random(),
      tipo: tipoMovimiento === "ingreso" ? "Ingreso" : "Egreso",
      cantidad,
      fecha,
      motivo,
    };
    onSave(nuevoMovimiento);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tipoMovimiento === "ingreso" ? "Registrar ingreso" : "Registrar egreso"}
          </DialogTitle>
          <DialogDescription>
            Completa los datos para registrar el movimiento de stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de movimiento */}
          <div>
            <Label>Tipo de movimiento</Label>
            <Select
              defaultValue={tipoMovimiento}
              onValueChange={(v) => setTipoMovimiento(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="egreso">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cantidad */}
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              placeholder="Ej: 10"
            />
          </div>

          {/* Fecha */}
          <div>
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fecha && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fecha ? format(fecha, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fecha}
                  onSelect={setFecha}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Motivo */}
          <div>
            <Label>Motivo o descripción</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                tipoMovimiento === "ingreso"
                  ? "Ej: Compra a proveedor"
                  : "Ej: Uso en procedimiento quirúrgico"
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t mt-4 pt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className={`${
              tipoMovimiento === "ingreso"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-rose-600 hover:bg-rose-700"
            } text-white`}
            onClick={handleSave}
          >
            Guardar movimiento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
