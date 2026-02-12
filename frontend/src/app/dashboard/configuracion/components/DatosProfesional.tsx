"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Profesional } from "@/hooks/useProfesionalMe";
import { useUpdateProfesional } from "@/hooks/useUpdateProfesional";
import { useTiposTurno } from "@/hooks/useTipoTurnos";
import {
  useConfigTiposTurno,
  useSaveConfigTiposTurno,
  ConfigTipoTurnoItem,
} from "@/hooks/useConfigTiposTurno";

type Props = {
  profesional: Profesional;
};

// Default color palette for new configs
const DEFAULT_COLORS = [
  "#6366F1", "#0EA5E9", "#F43F5E", "#8B5CF6",
  "#EF4444", "#22C55E", "#F59E0B", "#EC4899",
];

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
    <div className="space-y-6">
      {/* Card de datos profesionales */}
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

      {/* Card de config por tipo de turno */}
      <ConfigTiposTurnoSection profesionalId={profesional.id} />
    </div>
  );
}

// ── Config por tipo de turno ────────────────────────────────────────

type LocalConfig = {
  tipoTurnoId: string;
  duracionMinutos: string; // string for input control
  colorHex: string;
};

function ConfigTiposTurnoSection({ profesionalId }: { profesionalId: string }) {
  const { data: tiposTurno = [], isLoading: loadingTipos } = useTiposTurno();
  const { data: existingConfig = [], isLoading: loadingConfig } =
    useConfigTiposTurno(profesionalId);
  const saveMutation = useSaveConfigTiposTurno(profesionalId);

  const [configs, setConfigs] = useState<LocalConfig[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize local state when data arrives
  useEffect(() => {
    if (tiposTurno.length === 0 || initialized) return;

    const configMap = new Map(
      existingConfig.map((c) => [c.tipoTurnoId, c])
    );

    setConfigs(
      tiposTurno.map((tipo, idx) => {
        const existing = configMap.get(tipo.id);
        return {
          tipoTurnoId: tipo.id,
          duracionMinutos: existing?.duracionMinutos?.toString() ?? "",
          colorHex: existing?.colorHex ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        };
      })
    );
    setInitialized(true);
  }, [tiposTurno, existingConfig, initialized]);

  const updateConfig = (tipoTurnoId: string, field: keyof Omit<LocalConfig, "tipoTurnoId">, value: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.tipoTurnoId === tipoTurnoId ? { ...c, [field]: value } : c
      )
    );
  };

  const handleSaveConfig = async () => {
    const items = configs.map((c) => ({
      tipoTurnoId: c.tipoTurnoId,
      duracionMinutos: c.duracionMinutos ? parseInt(c.duracionMinutos) : null,
      colorHex: c.colorHex || null,
    }));

    try {
      await saveMutation.mutateAsync(items);
      toast.success("Configuración de tipos de turno guardada");
    } catch {
      toast.error("Error al guardar la configuración");
    }
  };

  if (loadingTipos || loadingConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando tipos de turno...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Configuración por tipo de turno</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Definí duración y color para cada tipo de turno en tu agenda
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSaveConfig}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Guardar
        </Button>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Tipo de turno
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 w-40">
                  Duración (min)
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 w-32">
                  Color
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 w-24">
                  Vista previa
                </th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const tipo = tiposTurno.find((t) => t.id === config.tipoTurnoId);
                if (!tipo) return null;

                return (
                  <tr key={config.tipoTurnoId} className="border-b last:border-b-0">
                    <td className="p-3">
                      <p className="font-medium text-sm">{tipo.nombre}</p>
                      {tipo.duracionDefault && (
                        <p className="text-xs text-muted-foreground">
                          Default global: {tipo.duracionDefault} min
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        placeholder={tipo.duracionDefault?.toString() || "30"}
                        value={config.duracionMinutos}
                        onChange={(e) =>
                          updateConfig(config.tipoTurnoId, "duracionMinutos", e.target.value)
                        }
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.colorHex}
                          onChange={(e) =>
                            updateConfig(config.tipoTurnoId, "colorHex", e.target.value)
                          }
                          className="h-8 w-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={config.colorHex}
                          onChange={(e) =>
                            updateConfig(config.tipoTurnoId, "colorHex", e.target.value)
                          }
                          className="h-8 w-24 font-mono text-xs"
                          placeholder="#000000"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div
                        className="rounded px-2 py-1 text-xs font-medium border-l-3 truncate"
                        style={{
                          backgroundColor: config.colorHex + "1A",
                          borderLeftColor: config.colorHex,
                          color: config.colorHex,
                        }}
                      >
                        {tipo.nombre}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
