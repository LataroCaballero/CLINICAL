"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Loader2,
  Plus,
  Trash2,
  CalendarIcon,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useProveedores } from "@/hooks/useProveedores";
import { useProductos } from "@/hooks/useProductos";
import { useCargaFactura } from "@/hooks/useOrdenesCompra";
import {
  CondicionPagoProveedor,
  TipoHonorario,
} from "@/types/stock";
import { toast } from "sonner";

interface CargaFacturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ItemFactura {
  productoId: string;
  productoNombre: string; // for inline creation
  isNew: boolean;
  cantidad: number;
  precioFactura: number;
  tipoHonorario: TipoHonorario;
  honorario: number;
}

const CONDICIONES_PAGO: { value: CondicionPagoProveedor; label: string }[] = [
  { value: "CONTADO", label: "Contado" },
  { value: "DIAS_30", label: "30 días" },
  { value: "DIAS_60", label: "60 días" },
  { value: "DIAS_90", label: "90 días" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

const emptyItem = (): ItemFactura => ({
  productoId: "",
  productoNombre: "",
  isNew: false,
  cantidad: 1,
  precioFactura: 0,
  tipoHonorario: "FIJO",
  honorario: 0,
});

export default function CargaFacturaModal({
  open,
  onOpenChange,
  onSuccess,
}: CargaFacturaModalProps) {
  // Proveedor
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [isNewProveedor, setIsNewProveedor] = useState(false);

  // Cabecera
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState<Date>(new Date());

  // Items
  const [items, setItems] = useState<ItemFactura[]>([emptyItem()]);

  // Pago
  const [condicionPago, setCondicionPago] =
    useState<CondicionPagoProveedor>("CONTADO");
  const [cantidadCuotas, setCantidadCuotas] = useState(1);
  const [fechaPrimerVencimiento, setFechaPrimerVencimiento] =
    useState<Date | null>(null);

  // Data
  const { data: proveedores } = useProveedores();
  const { data: productos } = useProductos();
  const cargaFactura = useCargaFactura();

  useEffect(() => {
    if (condicionPago === "CONTADO") {
      setCantidadCuotas(1);
      setFechaPrimerVencimiento(null);
    } else if (condicionPago !== "PERSONALIZADO") {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 30);
      setFechaPrimerVencimiento(fecha);
    }
  }, [condicionPago]);

  const handleAddItem = () => {
    setItems([...items, emptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, updates: Partial<ItemFactura>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleProductoSelect = (index: number, value: string) => {
    if (value === "__new__") {
      updateItem(index, { productoId: "", isNew: true, productoNombre: "" });
    } else {
      updateItem(index, { productoId: value, isNew: false, productoNombre: "" });
    }
  };

  const calcCostoUnitario = (item: ItemFactura): number => {
    if (item.cantidad <= 0) return 0;
    return item.precioFactura / item.cantidad;
  };

  const calcPrecioVenta = (item: ItemFactura): number => {
    const costo = calcCostoUnitario(item);
    if (item.tipoHonorario === "PORCENTAJE") {
      return costo * (1 + item.honorario / 100);
    }
    return costo + item.honorario;
  };

  const totalFactura = useMemo(
    () => items.reduce((sum, item) => sum + item.precioFactura, 0),
    [items]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proveedorId && !isNewProveedor) {
      toast.error("Selecciona un proveedor o crea uno nuevo");
      return;
    }

    if (isNewProveedor && !proveedorNombre.trim()) {
      toast.error("Ingresa el nombre del proveedor");
      return;
    }

    const validItems = items.filter(
      (item) =>
        (item.productoId || (item.isNew && item.productoNombre.trim())) &&
        item.cantidad > 0 &&
        item.precioFactura > 0
    );

    if (validItems.length === 0) {
      toast.error("Agrega al menos un producto con cantidad y precio");
      return;
    }

    if (condicionPago !== "CONTADO" && !fechaPrimerVencimiento) {
      toast.error("Selecciona la fecha del primer vencimiento");
      return;
    }

    try {
      await cargaFactura.mutateAsync({
        proveedorId: isNewProveedor ? undefined : proveedorId,
        proveedorNombre: isNewProveedor ? proveedorNombre.trim() : undefined,
        numeroFactura: numeroFactura.trim() || undefined,
        fechaFactura: fechaFactura.toISOString(),
        condicionPago,
        cantidadCuotas: condicionPago === "CONTADO" ? 1 : cantidadCuotas,
        fechaPrimerVencimiento: fechaPrimerVencimiento?.toISOString(),
        items: validItems.map((item) => ({
          productoId: item.isNew ? undefined : item.productoId,
          productoNombre: item.isNew ? item.productoNombre.trim() : undefined,
          cantidad: item.cantidad,
          precioFactura: item.precioFactura,
          tipoHonorario: item.tipoHonorario,
          honorario: item.honorario,
        })),
      });
      toast.success("Factura cargada correctamente");
      resetForm();
      onSuccess();
    } catch {
      toast.error("Error al cargar la factura");
    }
  };

  const resetForm = () => {
    setProveedorId("");
    setProveedorNombre("");
    setIsNewProveedor(false);
    setNumeroFactura("");
    setFechaFactura(new Date());
    setItems([emptyItem()]);
    setCondicionPago("CONTADO");
    setCantidadCuotas(1);
    setFechaPrimerVencimiento(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
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
      <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Cargar Factura de Proveedor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Cabecera */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Proveedor */}
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              {isNewProveedor ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del proveedor"
                    value={proveedorNombre}
                    onChange={(e) => setProveedorNombre(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsNewProveedor(false);
                      setProveedorNombre("");
                    }}
                    className="shrink-0"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select
                  value={proveedorId}
                  onValueChange={(v) => {
                    if (v === "__new__") {
                      setIsNewProveedor(true);
                      setProveedorId("");
                    } else {
                      setProveedorId(v);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <Plus className="w-3 h-3" /> Crear nuevo proveedor
                      </span>
                    </SelectItem>
                    {proveedores?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Nro factura */}
            <div className="space-y-2">
              <Label>Nro. Factura</Label>
              <Input
                placeholder="Ej: A-0001-00001234"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
              />
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label>Fecha Factura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(fechaFactura, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaFactura}
                    onSelect={(d) => d && setFechaFactura(d)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
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
                Agregar ítem
              </Button>
            </div>

            {/* Header de la tabla de items */}
            <div className="hidden md:grid md:grid-cols-[1fr_90px_120px_100px_130px_100px_120px_40px] gap-2 px-3 text-xs text-gray-500 font-medium">
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Precio Factura</span>
              <span>Costo/Ud</span>
              <span>Honorario</span>
              <span></span>
              <span>Precio Venta</span>
              <span></span>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col md:grid md:grid-cols-[1fr_90px_120px_100px_130px_100px_120px_40px] items-start md:items-center gap-2 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Producto */}
                  <div className="w-full min-w-0">
                    {item.isNew ? (
                      <div className="flex gap-1">
                        <Input
                          placeholder="Nombre del producto"
                          value={item.productoNombre}
                          onChange={(e) =>
                            updateItem(index, {
                              productoNombre: e.target.value,
                            })
                          }
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs"
                          onClick={() =>
                            updateItem(index, {
                              isNew: false,
                              productoNombre: "",
                            })
                          }
                        >
                          X
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={item.productoId}
                        onValueChange={(v) =>
                          handleProductoSelect(index, v)
                        }
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new__">
                            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                              <Plus className="w-3 h-3" /> Crear producto
                            </span>
                          </SelectItem>
                          {productos?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="truncate">
                                {p.nombre}
                                {p.sku && (
                                  <span className="text-gray-400 ml-1">
                                    ({p.sku})
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Cantidad */}
                  <Input
                    type="number"
                    min={1}
                    placeholder="Cant."
                    value={item.cantidad || ""}
                    onChange={(e) =>
                      updateItem(index, {
                        cantidad: Number(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                  />

                  {/* Precio Factura (total del ítem) */}
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="$ Total"
                    value={item.precioFactura || ""}
                    onChange={(e) =>
                      updateItem(index, {
                        precioFactura: Number(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                  />

                  {/* Costo/Unidad (calculado) */}
                  <div className="text-sm text-gray-600 font-mono text-center px-1">
                    {item.cantidad > 0 && item.precioFactura > 0
                      ? formatMoney(calcCostoUnitario(item))
                      : "-"}
                  </div>

                  {/* Honorario: toggle + input */}
                  <div className="flex items-center gap-1">
                    <Select
                      value={item.tipoHonorario}
                      onValueChange={(v) =>
                        updateItem(index, {
                          tipoHonorario: v as TipoHonorario,
                        })
                      }
                    >
                      <SelectTrigger className="w-[52px] text-xs px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIJO">$</SelectItem>
                        <SelectItem value="PORCENTAJE">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      value={item.honorario || ""}
                      onChange={(e) =>
                        updateItem(index, {
                          honorario: Number(e.target.value) || 0,
                        })
                      }
                      className="text-sm w-[70px]"
                    />
                  </div>

                  {/* Spacer for alignment */}
                  <div />

                  {/* Precio Venta (calculado) */}
                  <div className="text-sm font-semibold text-right">
                    {item.cantidad > 0 && item.precioFactura > 0
                      ? formatMoney(calcPrecioVenta(item))
                      : "-"}
                  </div>

                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
              <span className="text-gray-500">Total Factura:</span>
              <span className="text-xl font-bold">
                {formatMoney(totalFactura)}
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

            {showCuotasConfig && cantidadCuotas > 1 && totalFactura > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Se generarán {cantidadCuotas} cuotas de{" "}
                {formatMoney(totalFactura / cantidadCuotas)} cada una
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
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={cargaFactura.isPending}
            >
              {cargaFactura.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              <FileText className="w-4 h-4 mr-2" />
              Cargar Factura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
