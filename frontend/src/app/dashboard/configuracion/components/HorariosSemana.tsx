"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Profesional, AgendaConfig } from "@/hooks/useProfesionalMe";
import { useUpdateAgenda } from "@/hooks/useAgenda";

type Props = {
  profesional: Profesional;
};

const DIAS = [
  { num: 1, nombre: "Lunes" },
  { num: 2, nombre: "Martes" },
  { num: 3, nombre: "Miércoles" },
  { num: 4, nombre: "Jueves" },
  { num: 5, nombre: "Viernes" },
  { num: 6, nombre: "Sábado" },
  { num: 0, nombre: "Domingo" },
];

type HorariosDia = {
  activo: boolean;
  bloques: Array<{ inicio: string; fin: string }>;
};

type HorariosState = Record<number, HorariosDia>;

function getDefaultHorarios(): HorariosState {
  const horarios: HorariosState = {};
  DIAS.forEach((d) => {
    horarios[d.num] = {
      activo: d.num >= 1 && d.num <= 5, // Lunes a viernes activos por defecto
      bloques: [{ inicio: "09:00", fin: "18:00" }],
    };
  });
  return horarios;
}

export default function HorariosSemana({ profesional }: Props) {
  const agenda = profesional.agenda as AgendaConfig | null;
  const initialHorarios = agenda?.horariosTrabajo || getDefaultHorarios();

  const [horarios, setHorarios] = useState<HorariosState>(initialHorarios);
  const [hasChanges, setHasChanges] = useState(false);

  const updateAgenda = useUpdateAgenda();

  const handleToggleDay = (dia: number) => {
    setHorarios((prev) => {
      const current = prev[dia] || { activo: false, bloques: [] };
      const newActivo = !current.activo;

      return {
        ...prev,
        [dia]: {
          activo: newActivo,
          // Si se activa y no tiene bloques, agregar uno por defecto
          bloques: newActivo && current.bloques.length === 0
            ? [{ inicio: "09:00", fin: "18:00" }]
            : current.bloques,
        },
      };
    });
    setHasChanges(true);
  };

  const handleBloqueChange = (
    dia: number,
    idx: number,
    field: "inicio" | "fin",
    value: string
  ) => {
    setHorarios((prev) => {
      const bloques = [...(prev[dia]?.bloques || [])];
      bloques[idx] = { ...bloques[idx], [field]: value };
      return {
        ...prev,
        [dia]: { ...prev[dia], bloques },
      };
    });
    setHasChanges(true);
  };

  const handleAddBloque = (dia: number) => {
    setHorarios((prev) => {
      const bloques = [...(prev[dia]?.bloques || [])];
      bloques.push({ inicio: "14:00", fin: "18:00" });
      return {
        ...prev,
        [dia]: { ...prev[dia], bloques },
      };
    });
    setHasChanges(true);
  };

  const handleRemoveBloque = (dia: number, idx: number) => {
    setHorarios((prev) => {
      const bloques = [...(prev[dia]?.bloques || [])];
      bloques.splice(idx, 1);
      return {
        ...prev,
        [dia]: { ...prev[dia], bloques },
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateAgenda.mutateAsync({
        profesionalId: profesional.id,
        data: { horariosTrabajo: horarios },
      });
      toast.success("Horarios guardados");
      setHasChanges(false);
    } catch {
      toast.error("Error al guardar horarios");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Horarios de trabajo</CardTitle>
        {hasChanges && (
          <Button onClick={handleSave} disabled={updateAgenda.isPending}>
            {updateAgenda.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Guardar cambios
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {DIAS.map((dia) => {
          const rawConfig = horarios[dia.num];
          const config = {
            activo: rawConfig?.activo ?? false,
            bloques: rawConfig?.bloques ?? [],
          };

          return (
            <div
              key={dia.num}
              className={`p-4 rounded-lg border ${
                config.activo ? "bg-white" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.activo}
                    onCheckedChange={() => handleToggleDay(dia.num)}
                  />
                  <Label className="font-medium">{dia.nombre}</Label>
                </div>

                {config.activo && config.bloques.length < 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddBloque(dia.num)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar bloque
                  </Button>
                )}
              </div>

              {config.activo && (
                <div className="space-y-2 ml-10">
                  {config.bloques.map((bloque, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={bloque.inicio}
                        onChange={(e) =>
                          handleBloqueChange(dia.num, idx, "inicio", e.target.value)
                        }
                        className="w-32"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={bloque.fin}
                        onChange={(e) =>
                          handleBloqueChange(dia.num, idx, "fin", e.target.value)
                        }
                        className="w-32"
                      />
                      {config.bloques.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBloque(dia.num, idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
