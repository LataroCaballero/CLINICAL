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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function NewProductModal({ open, onOpenChange, onSave }: any) {
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    proveedor: "",
    precio: "",
    stock: "",
    stockMinimo: "",
    descripcion: "",
    usoInterno: false,
    fechaVencimiento: new Date(),
    imagen: null as File | null,
  });

  const handleSave = () => {
    if (!form.nombre || !form.categoria) return alert("Completá todos los campos obligatorios");
    const nuevoProducto = { id: Math.random(), ...form };
    onSave(nuevoProducto);
    onOpenChange(false);
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) setForm((prev) => ({ ...prev, imagen: file }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar nuevo producto</DialogTitle>
          <DialogDescription>
            Completa la información del producto para incorporarlo al inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Nombre */}
          <div>
            <Label>Nombre del producto</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Crema regeneradora facial"
            />
          </div>

          {/* Categoría */}
          <div>
            <Label>Categoría</Label>
            <Select onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cremas">Cremas</SelectItem>
                <SelectItem value="suplementos">Suplementos</SelectItem>
                <SelectItem value="accesorios">Accesorios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Proveedor */}
          <div>
            <Label>Proveedor</Label>
            <Input
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              placeholder="Ej: Laboratorios SkinLab"
            />
          </div>

          {/* Precio */}
          <div>
            <Label>Precio de venta</Label>
            <Input
              type="number"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              placeholder="Ej: 3500"
            />
          </div>

          {/* Stock actual */}
          <div>
            <Label>Stock actual</Label>
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="Ej: 20"
            />
          </div>

          {/* Stock mínimo */}
          <div>
            <Label>Stock mínimo</Label>
            <Input
              type="number"
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
              placeholder="Ej: 5"
            />
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <Label>Fecha de vencimiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.fechaVencimiento && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.fechaVencimiento
                    ? format(form.fechaVencimiento, "PPP", { locale: es })
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.fechaVencimiento}
                  onSelect={(date) => setForm({ ...form, fechaVencimiento: date! })}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Imagen */}
          <div className="flex flex-col">
            <Label>Imagen del producto</Label>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="flex items-center gap-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4" /> Subir imagen
                </label>
              </Button>
              <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {form.imagen && (
                <span className="text-xs text-gray-600">{form.imagen.name}</span>
              )}
            </div>
          </div>

          {/* Uso interno */}
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={form.usoInterno}
              onCheckedChange={(checked) => setForm({ ...form, usoInterno: checked })}
            />
            <Label>Solo uso interno</Label>
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: Crema regeneradora con ácido hialurónico y colágeno"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleSave}
          >
            Guardar producto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
