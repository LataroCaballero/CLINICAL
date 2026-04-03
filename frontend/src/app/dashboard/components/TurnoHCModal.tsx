"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Plus,
  FileText,
  CalendarDays,
  AlertCircle,
  FileCode,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { useHistoriaClinica } from "@/hooks/useHistoriaClinica";
import { useAvailableHCTemplates } from "@/hooks/useHCTemplates";
import {
  useCreateHCEntry,
  useHCEntry,
  useHCDraftEntries,
} from "@/hooks/useHCEntries";
import { DynamicTemplateWizard } from "@/components/hc-templates/runner";
import type {
  HCTemplateWithCurrentVersion,
  TemplateSchema,
  HCEntryFromTemplate,
} from "@/types/hc-templates";

type TurnoAgenda = {
  id: string;
  inicio: string;
  estado: string;
  observaciones?: string | null;
  entradaHCId?: string | null;
  esCirugia?: boolean;
  paciente: { id: string; nombreCompleto: string };
  tipoTurno: { id: string; nombre: string; esCirugia?: boolean };
};

type Props = {
  turno: TurnoAgenda | null;
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
};

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function yyyyMmDd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TurnoHCModal({ turno, open, onClose, selectedDate }: Props) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [wizardEntryId, setWizardEntryId] = useState<string | null>(null);
  const [wizardSchema, setWizardSchema] = useState<TemplateSchema | null>(null);

  const pacienteId = turno?.paciente.id ?? "";

  const { data: hcEntries, isLoading } = useHistoriaClinica(pacienteId);
  const { data: drafts = [] } = useHCDraftEntries(pacienteId || null);
  const { data: templates = [] } = useAvailableHCTemplates();
  const createTemplateEntry = useCreateHCEntry();
  const { data: wizardEntry } = useHCEntry(
    wizardEntryId ? pacienteId : null,
    wizardEntryId
  );

  if (!turno) return null;

  const selectedDateStr = yyyyMmDd(selectedDate);
  const allEntries: any[] = (hcEntries as any[]) ?? [];

  const linkedById = turno.entradaHCId
    ? allEntries.find((e) => e.id === turno.entradaHCId)
    : null;

  const entriesByDate = allEntries.filter((e) => {
    const d = new Date(e.fecha);
    return yyyyMmDd(d) === selectedDateStr;
  });

  const dayEntries = linkedById ? [linkedById] : entriesByDate;

  // Drafts for this day (filter by creation date)
  const dayDrafts = (drafts as HCEntryFromTemplate[]).filter((d) => {
    const created = new Date(d.createdAt);
    return yyyyMmDd(created) === selectedDateStr;
  });

  const handleSelectTemplate = async (template: HCTemplateWithCurrentVersion) => {
    if (!template.currentVersion) return;
    setShowTemplateSelector(false);
    try {
      const entry = await createTemplateEntry.mutateAsync({
        pacienteId,
        dto: {
          templateId: template.id,
          templateVersionId: template.currentVersion.id,
          fecha: yyyyMmDd(selectedDate),
        },
      });
      setWizardEntryId(entry.id);
      setWizardSchema(template.currentVersion.schema);
    } catch {
      toast.error("No se pudo crear la entrada");
    }
  };

  const handleContinueDraft = (draft: HCEntryFromTemplate) => {
    if (draft.templateVersion?.schema) {
      setWizardEntryId(draft.id);
      setWizardSchema(draft.templateVersion.schema as TemplateSchema);
    } else {
      toast.error("No se pudo cargar la plantilla del borrador");
    }
  };

  const handleCloseWizard = () => {
    setWizardEntryId(null);
    setWizardSchema(null);
  };

  // If wizard is open, take over the dialog content
  if (wizardEntryId && wizardSchema) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { handleCloseWizard(); onClose(); } }}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-6">
            <DynamicTemplateWizard
              entryId={wizardEntryId}
              pacienteId={pacienteId}
              schema={wizardSchema}
              initialAnswers={(wizardEntry?.answers as Record<string, unknown>) || {}}
              initialComputed={(wizardEntry?.computed as Record<string, unknown>) || {}}
              onClose={handleCloseWizard}
              onFinalize={handleCloseWizard}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              HC — {turno.paciente.nombreCompleto}
            </DialogTitle>
            <p className="text-sm text-gray-500">
              {turno.tipoTurno.nombre} · {hhmm(turno.inicio)} ·{" "}
              {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-4 py-2">

              {/* Borradores del día */}
              {dayDrafts.length > 0 && (
                <Card className="p-4 bg-amber-50 border-amber-200 space-y-2">
                  <p className="text-sm font-medium text-amber-800">Borradores pendientes</p>
                  {dayDrafts.map((draft) => (
                    <div key={draft.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <p className="text-sm font-medium">{draft.template?.nombre ?? "Borrador"}</p>
                        <p className="text-xs text-gray-500">
                          Última edición: {new Date(draft.updatedAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleContinueDraft(draft)}>
                        Continuar
                      </Button>
                    </div>
                  ))}
                </Card>
              )}

              {/* Entradas HC del día */}
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando historia clínica...
                </div>
              ) : dayEntries.length > 0 ? (
                <div className="space-y-3">
                  {dayEntries.map((entry) => (
                    <EntryReadOnly key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No hay entradas HC registradas para este día.
                </div>
              )}

              <Separator />

              {/* Agregar nueva entrada */}
              <div className="border border-dashed border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
                <p className="text-sm text-indigo-700 font-medium mb-1">
                  Agregar información a este día
                </p>
                <p className="text-xs text-indigo-500 mb-3">
                  Las entradas ya registradas no se pueden modificar por razones legales.
                </p>
                <Button
                  size="sm"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                  onClick={() => setShowTemplateSelector(true)}
                  disabled={createTemplateEntry.isPending}
                >
                  {createTemplateEntry.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 mr-1" />
                  )}
                  Nueva entrada HC
                </Button>
              </div>

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Template selector */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {templates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay plantillas disponibles.
                <br />
                Creá una desde Configuración → Plantillas HC
              </p>
            ) : (
              templates.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer hover:border-indigo-400 transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-sm">{template.nombre}</span>
                  </div>
                  {template.descripcion && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">{template.descripcion}</p>
                  )}
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EntryReadOnly({ entry }: { entry: any }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Badge read-only */}
      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Entrada finalizada — no puede modificarse por razones legales.</span>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span>
          {new Date(entry.fecha).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
        {entry.template?.nombre ? (
          <>
            <span className="text-gray-300">·</span>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {entry.template.nombre}
            </Badge>
          </>
        ) : (
          <Badge variant="outline" className="text-xs">Texto libre</Badge>
        )}
        <Badge className="ml-auto bg-green-100 text-green-700 hover:bg-green-100 text-xs">
          Finalizada
        </Badge>
      </div>

      {/* Contenido legacy */}
      {entry.contenido && typeof entry.contenido === "object" && (
        <div className="text-sm text-gray-700 space-y-1 pt-1">
          {entry.contenido.texto && (
            <p className="whitespace-pre-wrap">{entry.contenido.texto}</p>
          )}
          {entry.contenido.tipoPractica && (
            <p className="text-xs text-gray-500">
              Tipo: <span className="font-medium">{entry.contenido.tipoPractica}</span>
            </p>
          )}
          {entry.contenido.tipo === "primera_vez" && (
            <div className="space-y-1">
              {entry.contenido.diagnostico?.zonas?.length > 0 && (
                <p className="text-xs text-gray-600">
                  Zonas: <span className="font-medium">{entry.contenido.diagnostico.zonas.join(", ")}</span>
                </p>
              )}
              {entry.contenido.tratamientos?.length > 0 && (
                <p className="text-xs text-gray-600">
                  Tratamientos:{" "}
                  <span className="font-medium">
                    {entry.contenido.tratamientos.map((t: any) => t.nombre).join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Template answers */}
      {entry.answers &&
        typeof entry.answers === "object" &&
        Object.keys(entry.answers).length > 0 && (
          <div className="space-y-1 pt-1">
            {Object.entries(entry.answers as Record<string, unknown>)
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .slice(0, 6)
              .map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-gray-400 capitalize min-w-[110px]">
                    {k.replace(/_/g, " ")}:
                  </span>
                  <span className="text-gray-700">
                    {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                </div>
              ))}
          </div>
        )}
    </div>
  );
}
