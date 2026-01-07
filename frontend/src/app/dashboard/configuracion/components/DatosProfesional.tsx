"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Profesional } from "@/hooks/useProfesionalMe";
import { useUpdateProfesional } from "@/hooks/useUpdateProfesional";

type Props = {
  profesional: Profesional;
};

export default function DatosProfesional({ profesional }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    matricula: profesional.matricula || "",
    especialidad: profesional.especialidad || "",
    bio: profesional.bio || "",
    duracionDefault: profesional.duracionDefault || 30,
  });

  const updateMutation = useUpdateProfesional();

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: profesional.id,
        data: {
          matricula: form.matricula || undefined,
          especialidad: form.especialidad || undefined,
          bio: form.bio || undefined,
          duracionDefault: form.duracionDefault,
        },
      });
      toast.success("Datos actualizados");
      setIsEditing(false);
    } catch {
      toast.error("Error al guardar");
    }
  };

  const handleCancel = () => {
    setForm({
      matricula: profesional.matricula || "",
      especialidad: profesional.especialidad || "",
      bio: profesional.bio || "",
      duracionDefault: profesional.duracionDefault || 30,
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Datos profesionales</CardTitle>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Guardar
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info del usuario (no editable) */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-muted-foreground text-xs">Nombre</Label>
            <p className="font-medium">
              {profesional.usuario.nombre} {profesional.usuario.apellido}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="font-medium">{profesional.usuario.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Teléfono</Label>
            <p className="font-medium">
              {profesional.usuario.telefono || "-"}
            </p>
          </div>
        </div>

        {/* Campos editables */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Matrícula</Label>
            {isEditing ? (
              <Input
                value={form.matricula}
                onChange={(e) =>
                  setForm({ ...form, matricula: e.target.value })
                }
                placeholder="Número de matrícula"
              />
            ) : (
              <p className="py-2">{profesional.matricula || "-"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Especialidad</Label>
            {isEditing ? (
              <Input
                value={form.especialidad}
                onChange={(e) =>
                  setForm({ ...form, especialidad: e.target.value })
                }
                placeholder="Ej: Cirugía plástica"
              />
            ) : (
              <p className="py-2">{profesional.especialidad || "-"}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Duración por defecto de turnos (minutos)</Label>
          {isEditing ? (
            <Input
              type="number"
              min={5}
              max={240}
              value={form.duracionDefault}
              onChange={(e) =>
                setForm({ ...form, duracionDefault: parseInt(e.target.value) || 30 })
              }
            />
          ) : (
            <p className="py-2">{profesional.duracionDefault || 30} minutos</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Biografía / Presentación</Label>
          {isEditing ? (
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Breve descripción profesional..."
              rows={4}
            />
          ) : (
            <p className="py-2 whitespace-pre-wrap">
              {profesional.bio || "Sin biografía"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
