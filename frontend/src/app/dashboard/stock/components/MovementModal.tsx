"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon, Loader2, AlertTriangle, Info, DollarSign } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useCreateMovimiento } from "@/hooks/useInventario";
import { Inventario, TipoMovimientoStock } from "@/types/stock";
import { toast } from "sonner";

interface MovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventario: Inventario | null;
}

export default function MovementModal({
  open,
  onOpenChange,
  inventario,
}: MovementModalProps) {
  const [fecha, setFecha] = useState<Date>(new Date());
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [loteNumero, setLoteNumero] = useState("");
  const [loteFechaVencimiento, setLoteFechaVencimiento] = useState<Date | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState<string>("");
  const [actualizarPrecio, setActualizarPrecio] = useState(false);

  const createMovimiento = useCreateMovimiento();

  // Reset form when modal opens
  useEffect(() => {
    if (open && inventario) {
      setFecha(new Date());
      setCantidad(0);
      setMotivo("");
      setLoteNumero("");
      setLoteFechaVencimiento(null);
      setNuevoPrecio(inventario.precioActual?.toString() || "");
      setActualizarPrecio(false);
    }
  }, [open, inventario]);

  const handleSave = async (tipo: TipoMovimientoStock) => {
    if (!inventario) return;

    if (!cantidad || cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    // Validar stock disponible para egresos
    if (tipo === "SALIDA" && cantidad > inventario.stockActual) {
      toast.error(
        `Stock insuficiente. Disponible: ${inventario.stockActual}`
      );
      return;
    }

    // Validar fecha de vencimiento para productos con lote en ingresos
    if (tipo === "ENTRADA" && inventario.producto.requiereLote && !loteFechaVencimiento) {
      toast.error("Para productos con control de lote, debes ingresar la fecha de vencimiento");
      return;
    }

    try {
      await createMovimiento.mutateAsync({
        productoId: inventario.productoId,
        tipo,
        cantidad,
        motivo: motivo || undefined,
        fecha: fecha.toISOString(),
        loteNumero: tipo === "ENTRADA" && inventario.producto.requiereLote
          ? (loteNumero || undefined)
          : undefined,
        loteFechaVencimiento: tipo === "ENTRADA" && inventario.producto.requiereLote && loteFechaVencimiento
          ? loteFechaVencimiento.toISOString()
          : undefined,
        nuevoPrecio: tipo === "ENTRADA" && actualizarPrecio && nuevoPrecio
          ? parseFloat(nuevoPrecio)
          : undefined,
      });

      toast.success(
        tipo === "ENTRADA"
          ? `Ingreso de ${cantidad} unidades registrado`
          : `Egreso de ${cantidad} unidades registrado`
      );
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al registrar movimiento");
    }
  };

  if (!inventario) return null;

  const stockDisponible = inventario.stockActual;
  const requiereLote = inventario.producto.requiereLote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Producto: <strong>{inventario.producto.nombre}</strong>
            <br />
            Stock actual: <strong>{stockDisponible}</strong> unidades
            {requiereLote && (
              <span className="text-indigo-600 ml-2">(Control de lotes activo)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ingreso" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
            <TabsTrigger value="egreso">Egreso</TabsTrigger>
          </TabsList>

          {/* TAB INGRESO */}
          <TabsContent value="ingreso">
            <div className="space-y-4">
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
                      {fecha
                        ? format(fecha, "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(d) => d && setFecha(d)}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={cantidad || ""}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  placeholder="Ej: 10"
                />
              </div>

              {/* Campos de lote para productos que lo requieren */}
              {requiereLote && (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="text-indigo-700 text-sm">
                      Este producto requiere control de lote. Ingresa los datos del lote.
                    </span>
                  </div>

                  <div>
                    <Label>Número de lote</Label>
                    <Input
                      value={loteNumero}
                      onChange={(e) => setLoteNumero(e.target.value)}
                      placeholder="Ej: LOT-2024-001"
                    />
                  </div>

                  <div>
                    <Label>
                      Fecha de vencimiento <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !loteFechaVencimiento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {loteFechaVencimiento
                            ? format(loteFechaVencimiento, "PPP", { locale: es })
                            : "Seleccionar fecha de vencimiento"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={loteFechaVencimiento ?? undefined}
                          onSelect={(d) => setLoteFechaVencimiento(d ?? null)}
                          initialFocus
                          locale={es}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Compra a proveedor o reposición"
                />
              </div>

              {/* Actualizar precio de venta */}
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Switch
                    checked={actualizarPrecio}
                    onCheckedChange={setActualizarPrecio}
                  />
                  <Label className="cursor-pointer" onClick={() => setActualizarPrecio(!actualizarPrecio)}>
                    Actualizar precio de venta
                  </Label>
                </div>

                {actualizarPrecio && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        Precio actual: ${Number(inventario.precioActual || 0).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div>
                      <Label>Nuevo precio de venta</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(e.target.value)}
                        placeholder="Ej: 5500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => handleSave("ENTRADA")}
                  disabled={createMovimiento.isPending}
                >
                  {createMovimiento.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Registrar ingreso
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB EGRESO */}
          <TabsContent value="egreso">
            <div className="space-y-4">
              {stockDisponible === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-700 text-sm">
                    No hay stock disponible para egresar
                  </span>
                </div>
              )}

              {requiereLote && stockDisponible > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-blue-700 text-sm">
                    El egreso se realizará automáticamente de los lotes más próximos a vencer (FIFO).
                  </span>
                </div>
              )}

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
                      {fecha
                        ? format(fecha, "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(d) => d && setFecha(d)}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>
                  Cantidad{" "}
                  <span className="text-gray-500 text-xs">
                    (máx. {stockDisponible})
                  </span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={stockDisponible}
                  value={cantidad || ""}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  placeholder="Ej: 5"
                  disabled={stockDisponible === 0}
                />
              </div>

              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Uso en procedimiento quirúrgico"
                  disabled={stockDisponible === 0}
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => handleSave("SALIDA")}
                  disabled={createMovimiento.isPending || stockDisponible === 0}
                >
                  {createMovimiento.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Registrar egreso
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
