"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Mail, Send, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  useTiposReporte,
  useSuscripciones,
  useCreateSuscripcion,
  useUpdateSuscripcion,
  useToggleSuscripcion,
  useDeleteSuscripcion,
  useSendTestReport,
  TipoReporteEmail,
  FrecuenciaReporte,
  Suscripcion,
} from "@/hooks/useReportesSuscripciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const FRECUENCIA_LABELS: Record<FrecuenciaReporte, string> = {
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
};

const TIPO_REPORTE_LABELS: Record<TipoReporteEmail, string> = {
  RESUMEN_SEMANAL: "Resumen Semanal",
  RESUMEN_MENSUAL: "Resumen Mensual",
  INGRESOS: "Reporte de Ingresos",
  TURNOS: "Reporte de Turnos",
  MOROSIDAD: "Reporte de Morosidad",
};

export default function SuscripcionesReportes() {
  const { data: tiposReporte = [], isLoading: loadingTipos } = useTiposReporte();
  const { data: suscripciones = [], isLoading: loadingSuscripciones } = useSuscripciones();
  const createSuscripcion = useCreateSuscripcion();
  const updateSuscripcion = useUpdateSuscripcion();
  const toggleSuscripcion = useToggleSuscripcion();
  const deleteSuscripcion = useDeleteSuscripcion();
  const sendTestReport = useSendTestReport();

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openTest, setOpenTest] = React.useState(false);
  const [testSuscripcion, setTestSuscripcion] = React.useState<Suscripcion | null>(null);
  const [testEmail, setTestEmail] = React.useState("");
  const [formData, setFormData] = React.useState({
    tipoReporte: "" as TipoReporteEmail | "",
    frecuencia: "SEMANAL" as FrecuenciaReporte,
    emailDestino: "",
  });

  const resetForm = () => {
    setFormData({
      tipoReporte: "",
      frecuencia: "SEMANAL",
      emailDestino: "",
    });
  };

  // Tipos de reporte disponibles para crear (excluir los que ya tienen suscripción)
  const tiposDisponibles = tiposReporte.filter(
    (t) => !suscripciones.some((s) => s.tipoReporte === t.value)
  );

  const handleCreate = async () => {
    if (!formData.tipoReporte) {
      toast.error("Seleccioná un tipo de reporte");
      return;
    }

    try {
      await createSuscripcion.mutateAsync({
        tipoReporte: formData.tipoReporte,
        frecuencia: formData.frecuencia,
        emailDestino: formData.emailDestino || undefined,
      });
      toast.success("Suscripción creada correctamente");
      setOpenCreate(false);
      resetForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Error al crear la suscripción");
    }
  };

  const handleToggle = async (suscripcion: Suscripcion) => {
    try {
      await toggleSuscripcion.mutateAsync(suscripcion.id);
      toast.success(
        suscripcion.activo
          ? "Suscripción desactivada"
          : "Suscripción activada"
      );
    } catch {
      toast.error("Error al cambiar el estado de la suscripción");
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la suscripción a "${nombre}"?`)) return;

    try {
      await deleteSuscripcion.mutateAsync(id);
      toast.success("Suscripción eliminada");
    } catch {
      toast.error("Error al eliminar la suscripción");
    }
  };

  const handleFrecuenciaChange = async (id: string, frecuencia: FrecuenciaReporte) => {
    try {
      await updateSuscripcion.mutateAsync({
        id,
        dto: { frecuencia },
      });
      toast.success("Frecuencia actualizada");
    } catch {
      toast.error("Error al actualizar la frecuencia");
    }
  };

  const handleEmailChange = async (id: string, emailDestino: string | null) => {
    try {
      await updateSuscripcion.mutateAsync({
        id,
        dto: { emailDestino },
      });
      toast.success("Email actualizado");
    } catch {
      toast.error("Error al actualizar el email");
    }
  };

  const openTestDialog = (suscripcion: Suscripcion) => {
    setTestSuscripcion(suscripcion);
    setTestEmail(suscripcion.emailDestino || "");
    setOpenTest(true);
  };

  const handleSendTest = async () => {
    if (!testSuscripcion) return;

    try {
      const result = await sendTestReport.mutateAsync({
        tipoReporte: testSuscripcion.tipoReporte,
        emailDestino: testEmail || undefined,
      });

      if (result.success) {
        toast.success("Reporte de prueba enviado correctamente");
        setOpenTest(false);
      } else {
        toast.error("No se pudo enviar el reporte de prueba");
      }
    } catch {
      toast.error("Error al enviar el reporte de prueba");
    }
  };

  const isLoading = loadingTipos || loadingSuscripciones;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Reportes por Email
            </CardTitle>
            <CardDescription className="mt-1.5">
              Configurá qué reportes querés recibir automáticamente en tu email
            </CardDescription>
          </div>
          {tiposDisponibles.length > 0 && (
            <Button onClick={() => setOpenCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Suscripción
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {suscripciones.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Mail className="h-12 w-12 mx-auto text-gray-300" />
              <div>
                <p className="text-muted-foreground">
                  No tenés suscripciones a reportes configuradas.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Creá una para recibir reportes automáticos en tu email.
                </p>
              </div>
              <Button onClick={() => setOpenCreate(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera suscripción
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporte</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Email destino</TableHead>
                  <TableHead>Próximo envío</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suscripciones.map((suscripcion) => (
                  <SuscripcionRow
                    key={suscripcion.id}
                    suscripcion={suscripcion}
                    onToggle={() => handleToggle(suscripcion)}
                    onDelete={() =>
                      handleDelete(
                        suscripcion.id,
                        TIPO_REPORTE_LABELS[suscripcion.tipoReporte]
                      )
                    }
                    onFrecuenciaChange={(f) =>
                      handleFrecuenciaChange(suscripcion.id, f)
                    }
                    onEmailChange={(e) =>
                      handleEmailChange(suscripcion.id, e)
                    }
                    onSendTest={() => openTestDialog(suscripcion)}
                    isDeleting={deleteSuscripcion.isPending}
                    isUpdating={updateSuscripcion.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Suscripción */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva suscripción a reporte</DialogTitle>
            <DialogDescription>
              Seleccioná qué reporte querés recibir y con qué frecuencia.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo de reporte *</Label>
              <Select
                value={formData.tipoReporte}
                onValueChange={(v) =>
                  setFormData({ ...formData, tipoReporte: v as TipoReporteEmail })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un reporte" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDisponibles.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div>
                        <div>{tipo.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {tipo.descripcion}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Frecuencia *</Label>
              <Select
                value={formData.frecuencia}
                onValueChange={(v) =>
                  setFormData({ ...formData, frecuencia: v as FrecuenciaReporte })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMANAL">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Semanal (todos los lunes)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MENSUAL">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Mensual (primer día del mes)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Email destino (opcional)</Label>
              <Input
                type="email"
                value={formData.emailDestino}
                onChange={(e) =>
                  setFormData({ ...formData, emailDestino: e.target.value })
                }
                placeholder="Dejalo vacío para usar tu email de usuario"
              />
              <p className="text-xs text-muted-foreground">
                Si no especificás un email, se enviará a tu email de cuenta.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                resetForm();
              }}
              disabled={createSuscripcion.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createSuscripcion.isPending || !formData.tipoReporte}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {createSuscripcion.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Crear Suscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Enviar Prueba */}
      <Dialog open={openTest} onOpenChange={setOpenTest}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar reporte de prueba</DialogTitle>
            <DialogDescription>
              Se enviará un reporte de prueba de{" "}
              <strong>
                {testSuscripcion
                  ? TIPO_REPORTE_LABELS[testSuscripcion.tipoReporte]
                  : ""}
              </strong>{" "}
              al email especificado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email destino</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Dejalo vacío para usar tu email de usuario"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenTest(false)}
              disabled={sendTestReport.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={sendTestReport.isPending}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {sendTestReport.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Send className="h-4 w-4 mr-2" />
              Enviar Prueba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente separado para cada fila de suscripción
interface SuscripcionRowProps {
  suscripcion: Suscripcion;
  onToggle: () => void;
  onDelete: () => void;
  onFrecuenciaChange: (frecuencia: FrecuenciaReporte) => void;
  onEmailChange: (email: string | null) => void;
  onSendTest: () => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

function SuscripcionRow({
  suscripcion,
  onToggle,
  onDelete,
  onFrecuenciaChange,
  onSendTest,
  isDeleting,
}: SuscripcionRowProps) {
  return (
    <TableRow className={!suscripcion.activo ? "opacity-50" : ""}>
      <TableCell>
        <div className="font-medium">
          {TIPO_REPORTE_LABELS[suscripcion.tipoReporte]}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={suscripcion.frecuencia}
          onValueChange={(v) => onFrecuenciaChange(v as FrecuenciaReporte)}
          disabled={!suscripcion.activo}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SEMANAL">Semanal</SelectItem>
            <SelectItem value="MENSUAL">Mensual</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {suscripcion.emailDestino ? (
          <span className="text-sm">{suscripcion.emailDestino}</span>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Email de cuenta
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {suscripcion.proximoEnvio ? (
          <span className="text-sm text-muted-foreground">
            {format(new Date(suscripcion.proximoEnvio), "dd/MM/yyyy HH:mm", {
              locale: es,
            })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Switch
          checked={suscripcion.activo}
          onCheckedChange={onToggle}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSendTest}
            title="Enviar reporte de prueba"
          >
            <Send className="h-4 w-4 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
            title="Eliminar suscripción"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
