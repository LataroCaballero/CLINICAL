"use client";

import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Plus, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useProveedores } from "@/hooks/useProveedores";
import { useProductos } from "@/hooks/useProductos";
import { useCreateOrdenCompra } from "@/hooks/useOrdenesCompra";
import { CondicionPagoProveedor } from "@/types/stock";
import { toast } from "sonner";

interface NewOrdenCompraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ItemOrden {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

const CONDICIONES_PAGO: { value: CondicionPagoProveedor; label: string }[] = [
  { value: "CONTADO", label: "Contado" },
  { value: "DIAS_30", label: "30 días" },
  { value: "DIAS_60", label: "60 días" },
  { value: "DIAS_90", label: "90 días" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

export default function NewOrdenCompraModal({
  open,
  onOpenChange,
  onSuccess,
}: NewOrdenCompraModalProps) {
  const [proveedorId, setProveedorId] = useState("");
  const [items, setItems] = useState<ItemOrden[]>([
    { productoId: "", cantidad: 1, precioUnitario: 0 },
  ]);
  const [condicionPago, setCondicionPago] =
    useState<CondicionPagoProveedor>("CONTADO");
  const [cantidadCuotas, setCantidadCuotas] = useState(1);
  const [fechaPrimerVencimiento, setFechaPrimerVencimiento] =
    useState<Date | null>(null);

  const { data: proveedores } = useProveedores();
  const { data: productos } = useProductos();
  const createOrden = useCreateOrdenCompra();

  // Reset fecha when condicion changes
  useEffect(() => {
    if (condicionPago === "CONTADO") {
      setCantidadCuotas(1);
      setFechaPrimerVencimiento(null);
    } else if (condicionPago !== "PERSONALIZADO") {
      // For DIAS_30, DIAS_60, DIAS_90, set default fecha
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 30);
      setFechaPrimerVencimiento(fecha);
    }
  }, [condicionPago]);

  const handleAddItem = () => {
    setItems([...items, { productoId: "", cantidad: 1, precioUnitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ItemOrden,
    value: string | number
  ) => {
    const newItems = [...items];
    if (field === "productoId") {
      newItems[index].productoId = value as string;
      // Auto-fill precio from producto if available
      const producto = productos?.find((p) => p.id === value);
      if (producto?.costoBase) {
        newItems[index].precioUnitario = producto.costoBase;
      }
    } else if (field === "cantidad") {
      newItems[index].cantidad = Number(value) || 1;
    } else if (field === "precioUnitario") {
      newItems[index].precioUnitario = Number(value) || 0;
    }
    setItems(newItems);
  };

  const calcularTotal = () => {
    return items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proveedorId) {
      toast.error("Selecciona un proveedor");
      return;
    }

    const validItems = items.filter(
      (item) => item.productoId && item.cantidad > 0 && item.precioUnitario >= 0
    );

    if (validItems.length === 0) {
      toast.error("Agrega al menos un producto válido");
      return;
    }

    if (
      condicionPago !== "CONTADO" &&
      condicionPago !== "PERSONALIZADO" &&
      !fechaPrimerVencimiento
    ) {
      toast.error("Selecciona la fecha del primer vencimiento");
      return;
    }

    try {
      await createOrden.mutateAsync({
        proveedorId,
        items: validItems,
        condicionPago,
        cantidadCuotas:
          condicionPago === "CONTADO" ? 1 : cantidadCuotas,
        fechaPrimerVencimiento: fechaPrimerVencimiento?.toISOString(),
      });
      toast.success("Orden de compra creada correctamente");
      resetForm();
      onSuccess();
    } catch {
      toast.error("Error al crear la orden de compra");
    }
  };

  const resetForm = () => {
    setProveedorId("");
    setItems([{ productoId: "", cantidad: 1, precioUnitario: 0 }]);
    setCondicionPago("CONTADO");
    setCantidadCuotas(1);
    setFechaPrimerVencimiento(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value);

  const showCuotasConfig = condicionPago !== "CONTADO";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[950px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label>Proveedor *</Label>
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Productos *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <Select
                      value={item.productoId}
                      onValueChange={(v) =>
                        handleItemChange(index, "productoId", v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productos?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="truncate">
                              {p.nombre}
                              {p.sku && (
                                <span className="text-gray-400 ml-2">
                                  ({p.sku})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Cant."
                      value={item.cantidad || ""}
                      onChange={(e) =>
                        handleItemChange(index, "cantidad", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Precio"
                      value={item.precioUnitario || ""}
                      onChange={(e) =>
                        handleItemChange(index, "precioUnitario", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-28 flex-shrink-0 text-right text-sm font-medium">
                    {formatMoney(item.cantidad * item.precioUnitario)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end items-center gap-4 pt-2 border-t">
              <span className="text-gray-500">Total:</span>
              <span className="text-xl font-bold">
                {formatMoney(calcularTotal())}
              </span>
            </div>
          </div>

          {/* Condición de Pago */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-gray-700">Condición de Pago</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pago</Label>
                <Select
                  value={condicionPago}
                  onValueChange={(v) =>
                    setCondicionPago(v as CondicionPagoProveedor)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICIONES_PAGO.map((cp) => (
                      <SelectItem key={cp.value} value={cp.value}>
                        {cp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showCuotasConfig && (
                <div className="space-y-2">
                  <Label>Cantidad de Cuotas</Label>
                  <Select
                    value={cantidadCuotas.toString()}
                    onValueChange={(v) => setCantidadCuotas(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} cuota{n > 1 && "s"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {showCuotasConfig && (
              <div className="space-y-2">
                <Label>Fecha Primer Vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaPrimerVencimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaPrimerVencimiento
                        ? format(fechaPrimerVencimiento, "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaPrimerVencimiento ?? undefined}
                      onSelect={(d) => setFechaPrimerVencimiento(d ?? null)}
                      initialFocus
                      locale={es}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {showCuotasConfig && cantidadCuotas > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Se generarán {cantidadCuotas} cuotas de{" "}
                {formatMoney(calcularTotal() / cantidadCuotas)} cada una
                {condicionPago !== "PERSONALIZADO" && (
                  <>
                    {" "}
                    con vencimientos cada{" "}
                    {condicionPago === "DIAS_30"
                      ? "30"
                      : condicionPago === "DIAS_60"
                        ? "60"
                        : "90"}{" "}
                    días
                  </>
                )}
                .
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createOrden.isPending || !proveedorId}
            >
              {createOrden.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Crear Orden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
