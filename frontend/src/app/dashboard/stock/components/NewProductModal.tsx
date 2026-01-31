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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useCreateProducto } from "@/hooks/useCreateProducto";
import { CategoriaProductoCombobox } from "@/components/CategoriaProductoCombobox";
import { TipoProducto } from "@/types/stock";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NewProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewProductModal({
  open,
  onOpenChange,
}: NewProductModalProps) {
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    sku: "",
    tipo: "PRODUCTO_VENTA" as TipoProducto,
    precioSugerido: "",
    stockInicial: "",
    stockMinimo: "",
    unidadMedida: "",
    descripcion: "",
    requiereLote: false,
    loteNumero: "",
    loteFechaVencimiento: null as Date | null,
  });

  const createProducto = useCreateProducto();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({
        nombre: "",
        categoria: "",
        sku: "",
        tipo: "PRODUCTO_VENTA",
        precioSugerido: "",
        stockInicial: "",
        stockMinimo: "",
        unidadMedida: "",
        descripcion: "",
        requiereLote: false,
        loteNumero: "",
        loteFechaVencimiento: null,
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    // Validar que si requiere lote y tiene stock inicial, debe tener fecha de vencimiento
    if (form.requiereLote && form.stockInicial && parseInt(form.stockInicial) > 0) {
      if (!form.loteFechaVencimiento) {
        toast.error("Para productos con control de lote, debes ingresar la fecha de vencimiento");
        return;
      }
    }

    try {
      await createProducto.mutateAsync({
        nombre: form.nombre,
        categoria: form.categoria || undefined,
        sku: form.sku || undefined,
        tipo: form.tipo,
        precioSugerido: form.precioSugerido
          ? parseFloat(form.precioSugerido)
          : undefined,
        stockInicial: form.stockInicial
          ? parseInt(form.stockInicial)
          : undefined,
        stockMinimo: form.stockMinimo ? parseInt(form.stockMinimo) : undefined,
        unidadMedida: form.unidadMedida || undefined,
        descripcion: form.descripcion || undefined,
        requiereLote: form.requiereLote,
        precioActual: form.precioSugerido
          ? parseFloat(form.precioSugerido)
          : undefined,
        loteNumero: form.requiereLote ? (form.loteNumero || undefined) : undefined,
        loteFechaVencimiento: form.requiereLote && form.loteFechaVencimiento
          ? form.loteFechaVencimiento.toISOString()
          : undefined,
      });

      toast.success("Producto creado exitosamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al crear el producto"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar nuevo producto</DialogTitle>
          <DialogDescription>
            Completa la información del producto para incorporarlo al
            inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Nombre */}
          <div>
            <Label>
              Nombre del producto <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Crema regeneradora facial"
            />
          </div>

          {/* SKU */}
          <div>
            <Label>SKU (código único)</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="Ej: CREMA-001"
            />
          </div>

          {/* Tipo */}
          <div>
            <Label>Tipo de producto</Label>
            <Select
              value={form.tipo}
              onValueChange={(v: TipoProducto) =>
                setForm({ ...form, tipo: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCTO_VENTA">Producto de venta</SelectItem>
                <SelectItem value="INSUMO">Insumo médico</SelectItem>
                <SelectItem value="USO_INTERNO">Uso interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoría con Combobox */}
          <div>
            <Label>Categoría</Label>
            <CategoriaProductoCombobox
              value={form.categoria}
              onChange={(v) => setForm({ ...form, categoria: v })}
            />
          </div>

          {/* Precio */}
          <div>
            <Label>Precio de venta</Label>
            <Input
              type="number"
              min={0}
              value={form.precioSugerido}
              onChange={(e) =>
                setForm({ ...form, precioSugerido: e.target.value })
              }
              placeholder="Ej: 3500"
            />
          </div>

          {/* Unidad de medida */}
          <div>
            <Label>Unidad de medida</Label>
            <Input
              value={form.unidadMedida}
              onChange={(e) =>
                setForm({ ...form, unidadMedida: e.target.value })
              }
              placeholder="Ej: unidad, caja, ml"
            />
          </div>

          {/* Stock inicial */}
          <div>
            <Label>Stock inicial</Label>
            <Input
              type="number"
              min={0}
              value={form.stockInicial}
              onChange={(e) =>
                setForm({ ...form, stockInicial: e.target.value })
              }
              placeholder="Ej: 20"
            />
          </div>

          {/* Stock mínimo */}
          <div>
            <Label>Stock mínimo (alerta)</Label>
            <Input
              type="number"
              min={0}
              value={form.stockMinimo}
              onChange={(e) =>
                setForm({ ...form, stockMinimo: e.target.value })
              }
              placeholder="Ej: 5"
            />
          </div>

          {/* Requiere lote */}
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={form.requiereLote}
              onCheckedChange={(checked) =>
                setForm({ ...form, requiereLote: checked })
              }
            />
            <Label>Requiere control de lote/vencimiento</Label>
          </div>

          {/* Campos de lote (visibles solo si requiereLote está activo) */}
          {form.requiereLote && (
            <>
              <div>
                <Label>Número de lote inicial</Label>
                <Input
                  value={form.loteNumero}
                  onChange={(e) =>
                    setForm({ ...form, loteNumero: e.target.value })
                  }
                  placeholder="Ej: LOT-2024-001"
                />
              </div>

              <div>
                <Label>
                  Fecha de vencimiento{" "}
                  {form.stockInicial && parseInt(form.stockInicial) > 0 && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.loteFechaVencimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.loteFechaVencimiento
                        ? format(form.loteFechaVencimiento, "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.loteFechaVencimiento ?? undefined}
                      onSelect={(d) =>
                        setForm({ ...form, loteFechaVencimiento: d ?? null })
                      }
                      initialFocus
                      locale={es}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Descripción */}
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
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
            disabled={createProducto.isPending}
          >
            {createProducto.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Guardar producto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
