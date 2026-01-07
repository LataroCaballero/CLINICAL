"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePresupuestos, Presupuesto } from "@/hooks/usePresupuestos";
import {
  useCreatePresupuesto,
  useAceptarPresupuesto,
  useDeletePresupuesto,
  PresupuestoItemInput,
} from "@/hooks/useCreatePresupuesto";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Plus } from "lucide-react";

type Props = {
  pacienteId: string;
  onBack: () => void;
};

const estadoColors: Record<Presupuesto["estado"], string> = {
  BORRADOR: "bg-gray-100 text-gray-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  ACEPTADO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default function PresupuestosView({ pacienteId, onBack }: Props) {
  const { data: presupuestos = [], isLoading } = usePresupuestos(pacienteId);
  const createPresupuesto = useCreatePresupuesto();
  const aceptarPresupuesto = useAceptarPresupuesto();
  const deletePresupuesto = useDeletePresupuesto();
  const profesionalId = useEffectiveProfessionalId();

  const [openModal, setOpenModal] = useState(false);
  const [items, setItems] = useState<PresupuestoItemInput[]>([
    { descripcion: "", cantidad: 1, precioUnitario: 0 },
  ]);
  const [descuentos, setDescuentos] = useState("");

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precioUnitario: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof PresupuestoItemInput,
    value: string | number
  ) => {
    const newItems = [...items];
    if (field === "descripcion") {
      newItems[index].descripcion = value as string;
    } else if (field === "cantidad") {
      newItems[index].cantidad = Math.max(1, Number(value) || 1);
    } else if (field === "precioUnitario") {
      newItems[index].precioUnitario = Math.max(0, Number(value) || 0);
    }
    setItems(newItems);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.cantidad * item.precioUnitario,
    0
  );
  const descuentoNum = parseFloat(descuentos) || 0;
  const total = subtotal - descuentoNum;

  const handleCreate = async () => {
    if (!profesionalId) return;

    const validItems = items.filter(
      (item) => item.descripcion.trim() && item.precioUnitario > 0
    );
    if (validItems.length === 0) return;

    await createPresupuesto.mutateAsync({
      pacienteId,
      profesionalId,
      items: validItems,
      descuentos: descuentoNum > 0 ? descuentoNum : undefined,
    });

    setItems([{ descripcion: "", cantidad: 1, precioUnitario: 0 }]);
    setDescuentos("");
    setOpenModal(false);
  };

  const handleAceptar = async (presupuestoId: string) => {
    await aceptarPresupuesto.mutateAsync({ presupuestoId, pacienteId });
  };

  const handleDelete = async (presupuestoId: string) => {
    await deletePresupuesto.mutateAsync({ presupuestoId, pacienteId });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Volver
        </Button>
        <h2 className="text-lg font-semibold">Presupuestos</h2>
        <Button onClick={() => setOpenModal(true)}>Nuevo</Button>
      </div>

      {/* Estado de carga */}
      {isLoading && <p>Cargando presupuestos...</p>}

      {/* Sin presupuestos */}
      {!isLoading && presupuestos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay presupuestos registrados.
        </p>
      )}

      {/* Listado */}
      <div className="space-y-3">
        {presupuestos.map((p) => {
          const puedeAceptar = p.estado === "BORRADOR" || p.estado === "ENVIADO";
          const puedeBorrar = p.estado === "BORRADOR";

          return (
            <div
              key={p.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: es })}
                  </p>
                  <p className="font-semibold text-lg">
                    ${p.total.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={estadoColors[p.estado]}>{p.estado}</Badge>
                </div>
              </div>

              {/* Items */}
              <div className="text-sm text-muted-foreground">
                {p.items.map((item, idx) => (
                  <p key={idx}>
                    • {item.descripcion} (x{item.cantidad}) - $
                    {item.total.toLocaleString("es-AR")}
                  </p>
                ))}
                {p.descuentos > 0 && (
                  <p className="text-green-600">
                    Descuento: -${p.descuentos.toLocaleString("es-AR")}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                {puedeAceptar && (
                  <Button
                    size="sm"
                    onClick={() => handleAceptar(p.id)}
                    disabled={aceptarPresupuesto.isPending}
                  >
                    Aceptar
                  </Button>
                )}
                {puedeBorrar && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(p.id)}
                    disabled={deletePresupuesto.isPending}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nuevo presupuesto */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Descripcion"
                      value={item.descripcion}
                      onChange={(e) =>
                        updateItem(index, "descripcion", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Cant"
                      min={1}
                      value={item.cantidad}
                      onChange={(e) =>
                        updateItem(index, "cantidad", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      placeholder="Precio"
                      min={0}
                      value={item.precioUnitario || ""}
                      onChange={(e) =>
                        updateItem(index, "precioUnitario", e.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Descuento */}
            <div className="space-y-2">
              <Label htmlFor="descuento">Descuento (opcional)</Label>
              <Input
                id="descuento"
                type="number"
                placeholder="0"
                value={descuentos}
                onChange={(e) => setDescuentos(e.target.value)}
              />
            </div>

            {/* Totales */}
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString("es-AR")}</span>
              </div>
              {descuentoNum > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento:</span>
                  <span>-${descuentoNum.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createPresupuesto.isPending ||
                items.every((i) => !i.descripcion.trim() || i.precioUnitario <= 0)
              }
            >
              {createPresupuesto.isPending ? "Creando..." : "Crear Presupuesto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
