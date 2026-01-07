"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Profesional, AgendaConfig } from "@/hooks/useProfesionalMe";
import { useUpdateAgenda } from "@/hooks/useAgenda";

type Props = {
  profesional: Profesional;
};

type DiaBloqueado = {
  fecha: string;
  fechaFin?: string;
  motivo: string;
};

type DiaCirugia = {
  fecha: string;
  inicio: string;
  fin: string;
};

export default function CalendarioDisponibilidad({ profesional }: Props) {
  const agenda = profesional.agenda as AgendaConfig | null;

  const [diasBloqueados, setDiasBloqueados] = useState<DiaBloqueado[]>(
    agenda?.diasBloqueados || []
  );
  const [diasCirugia, setDiasCirugia] = useState<DiaCirugia[]>(
    agenda?.diasCirugia || []
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [modalType, setModalType] = useState<"bloqueado" | "cirugia" | null>(
    null
  );

  // Form state para modal
  const [formBloqueado, setFormBloqueado] = useState({
    fechaFin: "",
    motivo: "Vacaciones",
  });
  const [formCirugia, setFormCirugia] = useState({
    inicio: "08:00",
    fin: "14:00",
  });

  const updateAgenda = useUpdateAgenda();

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
  };

  const openModal = (type: "bloqueado" | "cirugia") => {
    if (!selectedDate) {
      toast.error("Seleccioná una fecha primero");
      return;
    }
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
    setFormBloqueado({ fechaFin: "", motivo: "Vacaciones" });
    setFormCirugia({ inicio: "08:00", fin: "14:00" });
  };

  const handleAddBloqueado = async () => {
    if (!selectedDate) return;

    const fecha = format(selectedDate, "yyyy-MM-dd");
    const nuevoDia: DiaBloqueado = {
      fecha,
      motivo: formBloqueado.motivo,
      ...(formBloqueado.fechaFin ? { fechaFin: formBloqueado.fechaFin } : {}),
    };

    const updated = [...diasBloqueados, nuevoDia];
    setDiasBloqueados(updated);

    try {
      await updateAgenda.mutateAsync({
        profesionalId: profesional.id,
        data: { diasBloqueados: updated },
      });
      toast.success("Día bloqueado agregado");
      closeModal();
    } catch {
      toast.error("Error al guardar");
      setDiasBloqueados(diasBloqueados);
    }
  };

  const handleAddCirugia = async () => {
    if (!selectedDate) return;

    const fecha = format(selectedDate, "yyyy-MM-dd");
    const nuevoDia: DiaCirugia = {
      fecha,
      inicio: formCirugia.inicio,
      fin: formCirugia.fin,
    };

    const updated = [...diasCirugia, nuevoDia];
    setDiasCirugia(updated);

    try {
      await updateAgenda.mutateAsync({
        profesionalId: profesional.id,
        data: { diasCirugia: updated },
      });
      toast.success("Día de cirugía agregado");
      closeModal();
    } catch {
      toast.error("Error al guardar");
      setDiasCirugia(diasCirugia);
    }
  };

  const handleRemoveBloqueado = async (fecha: string) => {
    const updated = diasBloqueados.filter((d) => d.fecha !== fecha);
    setDiasBloqueados(updated);

    try {
      await updateAgenda.mutateAsync({
        profesionalId: profesional.id,
        data: { diasBloqueados: updated },
      });
      toast.success("Día bloqueado eliminado");
    } catch {
      toast.error("Error al eliminar");
      setDiasBloqueados(diasBloqueados);
    }
  };

  const handleRemoveCirugia = async (fecha: string) => {
    const updated = diasCirugia.filter((d) => d.fecha !== fecha);
    setDiasCirugia(updated);

    try {
      await updateAgenda.mutateAsync({
        profesionalId: profesional.id,
        data: { diasCirugia: updated },
      });
      toast.success("Día de cirugía eliminado");
    } catch {
      toast.error("Error al eliminar");
      setDiasCirugia(diasCirugia);
    }
  };

  // Marcar días en el calendario
  const modifiers = {
    bloqueado: diasBloqueados.map((d) => new Date(d.fecha + "T00:00:00")),
    cirugia: diasCirugia.map((d) => new Date(d.fecha + "T00:00:00")),
  };

  const modifiersStyles = {
    bloqueado: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
      fontWeight: "bold",
    },
    cirugia: {
      backgroundColor: "#FEF9C3",
      color: "#854D0E",
      fontWeight: "bold",
    },
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendario */}
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDayClick}
              locale={es}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />

            {selectedDate && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal("bloqueado")}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Bloquear día
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal("cirugia")}
                  className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Día de cirugía
                </Button>
              </div>
            )}

            <div className="mt-4 flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                <span>Bloqueado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
                <span>Cirugía</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listas */}
        <div className="space-y-6">
          {/* Días bloqueados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Días bloqueados</CardTitle>
            </CardHeader>
            <CardContent>
              {diasBloqueados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay días bloqueados
                </p>
              ) : (
                <div className="space-y-2">
                  {diasBloqueados.map((d) => (
                    <div
                      key={d.fecha}
                      className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-200"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(d.fecha + "T00:00:00"), "dd/MM/yyyy")}
                          {d.fechaFin &&
                            ` - ${format(
                              new Date(d.fechaFin + "T00:00:00"),
                              "dd/MM/yyyy"
                            )}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.motivo}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBloqueado(d.fecha)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Días de cirugía */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Días de cirugía</CardTitle>
            </CardHeader>
            <CardContent>
              {diasCirugia.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay días de cirugía programados
                </p>
              ) : (
                <div className="space-y-2">
                  {diasCirugia.map((d) => (
                    <div
                      key={d.fecha}
                      className="flex items-center justify-between p-2 rounded bg-yellow-50 border border-yellow-200"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(d.fecha + "T00:00:00"), "dd/MM/yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.inicio} - {d.fin}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCirugia(d.fecha)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal día bloqueado */}
      <Dialog open={modalType === "bloqueado"} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear día</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fecha inicio</Label>
              <p className="font-medium">
                {selectedDate &&
                  format(selectedDate, "EEEE dd/MM/yyyy", { locale: es })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fecha fin (opcional, para rangos)</Label>
              <Input
                type="date"
                value={formBloqueado.fechaFin}
                onChange={(e) =>
                  setFormBloqueado({ ...formBloqueado, fechaFin: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select
                value={formBloqueado.motivo}
                onValueChange={(v) =>
                  setFormBloqueado({ ...formBloqueado, motivo: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="Feriado">Feriado</SelectItem>
                  <SelectItem value="Congreso">Congreso</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddBloqueado}
              disabled={updateAgenda.isPending}
            >
              {updateAgenda.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal día cirugía */}
      <Dialog open={modalType === "cirugia"} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Día de cirugía</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fecha</Label>
              <p className="font-medium">
                {selectedDate &&
                  format(selectedDate, "EEEE dd/MM/yyyy", { locale: es })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={formCirugia.inicio}
                  onChange={(e) =>
                    setFormCirugia({ ...formCirugia, inicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={formCirugia.fin}
                  onChange={(e) =>
                    setFormCirugia({ ...formCirugia, fin: e.target.value })
                  }
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Durante este horario no se podrán agendar turnos regulares.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddCirugia}
              disabled={updateAgenda.isPending}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              {updateAgenda.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
