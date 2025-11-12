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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function MovementModal({ open, onOpenChange, product, onSave }: any) {
  const [fecha, setFecha] = useState<Date>(new Date());
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState("");

  const handleSave = (tipo: "ingreso" | "egreso") => {
    if (!cantidad || cantidad <= 0) return alert("La cantidad debe ser mayor a 0");
    const movimiento = {
      id: Math.random(),
      producto: product?.nombre,
      tipo,
      cantidad,
      fecha,
      motivo,
    };
    onSave(movimiento);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Seleccioná el tipo de movimiento y completá los datos para el producto{" "}
            <strong>{product?.nombre}</strong>
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
                      {fecha ? format(fecha, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={setFecha}
                      required={true}
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
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  placeholder="Ej: 10"
                />
              </div>

              <div>
                <Label>Motivo</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Compra a proveedor o reposición"
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => handleSave("ingreso")}
                >
                  Registrar ingreso
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB EGRESO */}
          <TabsContent value="egreso">
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
                      {fecha ? format(fecha, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={setFecha}
                      required={true}
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
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  placeholder="Ej: 5"
                />
              </div>

              <div>
                <Label>Motivo</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Uso en procedimiento quirúrgico"
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => handleSave("egreso")}
                >
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
