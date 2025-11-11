"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function NewAppointmentModal({ open, onOpenChange, selectedEvent }: any) {
  const [form, setForm] = useState({
    paciente: "",
    tipo: "",
    fecha: new Date(),
    hora: "",
    observaciones: "",
  });

  // Si se abre para editar un turno existente
  useEffect(() => {
    if (selectedEvent) {
      setForm({
        paciente: selectedEvent.paciente || "",
        tipo: selectedEvent.tipo || "",
        fecha: selectedEvent.fecha ? new Date(selectedEvent.fecha) : new Date(),
        hora: selectedEvent.hora || "",
        observaciones: selectedEvent.observaciones || "",
      });
    }
  }, [selectedEvent]);

  const handleChange = (e: any) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = () => {
    console.log("Turno guardado o actualizado:", form);
    onOpenChange(false);
  };

  const handleDelete = () => {
    console.log("Turno eliminado:", form);
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    console.log(`Enviar recordatorio a ${form.paciente} por WhatsApp`);
    // Aquí luego integrás la automatización (Twilio o API de WhatsApp)
  };

  const isEditMode = !!selectedEvent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar turno" : "Nuevo turno"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Actualiza los datos del turno o envía un recordatorio."
              : "Completa los datos para agendar un nuevo turno."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Paciente</Label>
            <Input
              name="paciente"
              value={form.paciente}
              onChange={handleChange}
              placeholder="Buscar o escribir nombre del paciente"
            />
          </div>

          {/* Fecha + hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.fecha && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.fecha ? (
                      format(form.fecha, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.fecha}
                    onSelect={(date) =>
                      setForm((prev) => ({ ...prev, fecha: date }))
                    }
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Horario</Label>
              <Input
                type="time"
                name="hora"
                value={form.hora}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label>Tipo de turno</Label>
            <Select
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, tipo: v }))
              }
              value={form.tipo}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primera">Primera vez</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="prequirurgico">Prequirúrgico</SelectItem>
                <SelectItem value="cirugia">Cirugía</SelectItem>
                <SelectItem value="tratamiento">Tratamiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              placeholder="Detalles del procedimiento o notas adicionales..."
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            {isEditMode && (
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleDelete}
              >
                Eliminar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {isEditMode && (
              <Button
                className="bg-[#25D366] hover:bg-[#20b65a] text-white flex items-center gap-2"
                onClick={handleWhatsApp}
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </Button>
            )}
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={handleSave}
            >
              {isEditMode ? "Guardar cambios" : "Guardar turno"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
