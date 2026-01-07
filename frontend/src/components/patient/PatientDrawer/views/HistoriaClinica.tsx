// HistoriaClinica.tsx – con soporte para templates

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  FileText,
  ArrowLeft,
  ChevronDown,
  FileCode,
  Loader2,
  Trash2,
  GitBranch,
  CheckSquare,
  Calculator,
  Type,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useHistoriaClinica } from "@/hooks/useHistoriaClinica";
import { useCreateHistoriaClinicaEntry } from "@/hooks/useCreateHistoriaClinicaEntry";
import { useAvailableHCTemplates } from "@/hooks/useHCTemplates";
import {
  useCreateHCEntry,
  useHCDraftEntries,
  useHCEntry,
  useDeleteHCEntry,
} from "@/hooks/useHCEntries";
import { DynamicTemplateWizard } from "@/components/hc-templates/runner";
import type {
  HCTemplateWithCurrentVersion,
  TemplateSchema,
  HCEntryFromTemplate,
} from "@/types/hc-templates";

interface Props {
  pacienteId: string;
  onBack: () => void;
}

export default function HistoriaClinica({ pacienteId, onBack }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [contenido, setContenido] = useState("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [wizardEntryId, setWizardEntryId] = useState<string | null>(null);
  const [wizardSchema, setWizardSchema] = useState<TemplateSchema | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HCEntryFromTemplate | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<EntradaType | null>(null);

  const { data: entradas = [], isLoading, isError } = useHistoriaClinica(pacienteId);
  const { data: drafts = [] } = useHCDraftEntries(pacienteId);
  const { data: templates = [] } = useAvailableHCTemplates();
  const createEntry = useCreateHistoriaClinicaEntry();
  const createTemplateEntry = useCreateHCEntry();
  const deleteEntry = useDeleteHCEntry();

  // Load entry data for wizard
  const { data: wizardEntry } = useHCEntry(
    wizardEntryId ? pacienteId : null,
    wizardEntryId
  );

  const handleGuardar = async () => {
    if (!contenido.trim()) return;

    await createEntry.mutateAsync({ pacienteId, contenido });
    setContenido("");
    setShowForm(false);
  };

  const handleSelectTemplate = async (template: HCTemplateWithCurrentVersion) => {
    if (!template.currentVersion) return;

    setShowTemplateSelector(false);

    try {
      const entry = await createTemplateEntry.mutateAsync({
        pacienteId,
        dto: {
          templateId: template.id,
          templateVersionId: template.currentVersion.id,
        },
      });

      setWizardEntryId(entry.id);
      setWizardSchema(template.currentVersion.schema);
    } catch {
      // Error handled by mutation
    }
  };

  const handleContinueDraft = async (draft: HCEntryFromTemplate) => {
    // El draft ya tiene el schema en templateVersion
    if (draft.templateVersion?.schema) {
      setWizardEntryId(draft.id);
      setWizardSchema(draft.templateVersion.schema as TemplateSchema);
    } else {
      toast.error("No se pudo cargar la plantilla del borrador");
    }
  };

  const handleDeleteDraft = async () => {
    if (!deleteTarget) return;

    try {
      await deleteEntry.mutateAsync({
        pacienteId,
        entryId: deleteTarget.id,
      });
      toast.success("Borrador eliminado");
    } catch {
      toast.error("Error al eliminar el borrador");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCloseWizard = () => {
    setWizardEntryId(null);
    setWizardSchema(null);
  };

  const handleFinalizeWizard = () => {
    setWizardEntryId(null);
    setWizardSchema(null);
  };

  // If wizard is open, show it
  if (wizardEntryId && wizardSchema) {
    return (
      <div className="pb-6">
        <DynamicTemplateWizard
          entryId={wizardEntryId}
          pacienteId={pacienteId}
          schema={wizardSchema}
          initialAnswers={(wizardEntry?.answers as Record<string, unknown>) || {}}
          initialComputed={(wizardEntry?.computed as Record<string, unknown>) || {}}
          onClose={handleCloseWizard}
          onFinalize={handleFinalizeWizard}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" /> Historia clínica
          </h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nueva entrada
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowForm(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Texto libre
            </DropdownMenuItem>
            {templates.length > 0 && (
              <DropdownMenuItem onClick={() => setShowTemplateSelector(true)}>
                <FileCode className="w-4 h-4 mr-2" />
                Usar plantilla
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* DRAFTS */}
      {drafts.length > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-3">
            Borradores pendientes
          </h4>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-background rounded border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {draft.template?.nombre || "Entrada"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      v{draft.templateVersion?.version}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Última edición: {new Date(draft.updatedAt).toLocaleDateString("es-AR")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(draft)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleContinueDraft(draft)}>
                    Continuar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* FORM NUEVA ENTRADA (texto libre) */}
      {showForm && (
        <Card className="p-4 space-y-4">
          <h4 className="font-medium">Nueva entrada (texto libre)</h4>
          <Textarea
            placeholder="Escribí la evolución, observaciones o indicaciones clínicas…"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={createEntry.isPending}>
              Guardar
            </Button>
          </div>
        </Card>
      )}

      <Separator />

      {/* LISTADO */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-600">Error al cargar la historia clínica.</p>
        )}

        {!isLoading && entradas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Este paciente todavía no tiene entradas en su historia clínica.
          </p>
        )}

        {entradas.map((entrada: EntradaType) => (
          <EntryCard
            key={entrada.id}
            entrada={entrada}
            onClick={() => setExpandedEntry(entrada)}
          />
        ))}
      </div>

      {/* TEMPLATE SELECTOR MODAL */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay plantillas disponibles.
                <br />
                Creá una desde Configuración &rarr; Plantillas HC
              </p>
            ) : (
              templates.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="font-medium">{template.nombre}</div>
                  {template.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.descripcion}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar borrador</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que querés eliminar este borrador? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ENTRY DETAIL MODAL */}
      <Dialog open={!!expandedEntry} onOpenChange={() => setExpandedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expandedEntry?.template ? (
                <>
                  <FileCode className="w-5 h-5" />
                  {expandedEntry.template.nombre}
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Entrada de texto libre
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {expandedEntry && (
            <ExpandedEntryContent entrada={expandedEntry} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Types for entries
interface EntradaType {
  id: string;
  fecha: string;
  contenido?: { texto?: string };
  templateId?: string;
  template?: { nombre: string };
  templateVersion?: { schema?: TemplateSchema };
  answers?: Record<string, unknown>;
  computed?: Record<string, unknown>;
  status?: string;
  profesionalNombre?: string;
}

// Entry card component with improved visualization
function EntryCard({
  entrada,
  onClick,
}: {
  entrada: EntradaType;
  onClick: () => void;
}) {
  const isTemplateBased = !!entrada.templateId;
  const schema = entrada.templateVersion?.schema;

  return (
    <Card
      className="p-4 space-y-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
      onClick={onClick}
    >
      {/* Header: Fecha + Tipo de entrada */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {new Date(entrada.fecha).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {isTemplateBased && entrada.template ? (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {entrada.template.nombre}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Texto libre
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {entrada.profesionalNombre || "Profesional"}
        </span>
      </div>

      <Separator />

      {/* Content preview - truncated */}
      <div className="line-clamp-3">
        {isTemplateBased ? (
          <TemplateEntryPreview answers={entrada.answers} schema={schema} />
        ) : (
          <p className="text-sm whitespace-pre-line">
            {entrada.contenido?.texto || "(sin contenido)"}
          </p>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center pt-1">
        Click para ver más detalles
      </div>
    </Card>
  );
}

// Template entry preview (truncated for card view)
function TemplateEntryPreview({
  answers,
  schema,
}: {
  answers?: Record<string, unknown>;
  schema?: TemplateSchema;
}) {
  if (!answers || Object.keys(answers).length === 0) {
    return <p className="text-sm text-muted-foreground italic">(sin datos registrados)</p>;
  }

  // Show first 2-3 fields as preview
  const entries = Object.entries(answers).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">(sin datos registrados)</p>;
  }

  const nodesMap = schema ? new Map(schema.nodes.map((n) => [getNodeKey(n), n])) : null;
  const previewEntries = entries.slice(0, 3);

  return (
    <div className="space-y-1">
      {previewEntries.map(([key, value]) => {
        const node = nodesMap?.get(key);
        const nodeTitle = node?.title || formatKey(key);

        return (
          <div key={key} className="text-sm">
            <span className="text-muted-foreground">{nodeTitle}:</span>{" "}
            <span className="font-medium">{formatValue(value, node)}</span>
          </div>
        );
      })}
      {entries.length > 3 && (
        <p className="text-xs text-muted-foreground">
          +{entries.length - 3} campos más...
        </p>
      )}
    </div>
  );
}

// Full content for expanded modal view
function ExpandedEntryContent({ entrada }: { entrada: EntradaType }) {
  const isTemplateBased = !!entrada.templateId;
  const schema = entrada.templateVersion?.schema;

  return (
    <div className="space-y-4 py-2">
      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Fecha:</span>{" "}
          <span className="font-medium">
            {new Date(entrada.fecha).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Profesional:</span>{" "}
          <span className="font-medium">{entrada.profesionalNombre || "Profesional"}</span>
        </div>
      </div>

      <Separator />

      {/* Content */}
      {isTemplateBased ? (
        <TemplateFullContent answers={entrada.answers} computed={entrada.computed} schema={schema} />
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
          <p className="text-sm whitespace-pre-line">
            {entrada.contenido?.texto || "(sin contenido)"}
          </p>
        </div>
      )}
    </div>
  );
}

// Full template content for modal
function TemplateFullContent({
  answers,
  computed,
  schema,
}: {
  answers?: Record<string, unknown>;
  computed?: Record<string, unknown>;
  schema?: TemplateSchema;
}) {
  if (!answers || Object.keys(answers).length === 0) {
    return <p className="text-sm text-muted-foreground italic">(sin datos registrados)</p>;
  }

  const nodesMap = schema ? new Map(schema.nodes.map((n) => [getNodeKey(n), n])) : null;

  return (
    <div className="space-y-4">
      {/* Answers */}
      <div className="space-y-3">
        {Object.entries(answers).map(([key, value]) => {
          if (value === undefined || value === null || value === "") return null;

          const node = nodesMap?.get(key);
          const nodeTitle = node?.title || formatKey(key);
          const nodeType = node?.type;

          return (
            <div key={key} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <NodeTypeIcon type={nodeType} />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground block mb-1">
                  {nodeTitle}
                </span>
                <span className="text-sm font-medium">
                  {formatValue(value, node)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Computed values (e.g., presupuesto) */}
      {computed && Object.keys(computed).length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Valores calculados
            </h4>
            <div className="space-y-2">
              {Object.entries(computed).map(([key, value]) => {
                if (value === undefined || value === null) return null;

                return (
                  <div key={key} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <span className="text-xs text-muted-foreground block mb-1">
                      {formatKey(key)}
                    </span>
                    <span className="text-sm font-medium">
                      {formatComputedValue(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Format computed values (handles presupuesto objects, etc.)
function formatComputedValue(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  }

  if (typeof value === "object" && value !== null) {
    // Handle presupuesto-like objects
    const obj = value as Record<string, unknown>;
    if ("total" in obj) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(obj.total as number);
    }
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

// Helper to get node key
function getNodeKey(node: TemplateSchema["nodes"][0]): string {
  if ("key" in node && node.key) return node.key;
  return node.id;
}

// Helper to format key to readable label
function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// Helper to format value
function formatValue(value: unknown, node?: TemplateSchema["nodes"][0]): string {
  if (Array.isArray(value)) {
    // If it's a decision node with options, try to get labels
    if (node && "options" in node && node.options) {
      const labels = value.map((v) => {
        const opt = node.options.find((o) => o.value === v);
        return opt?.label || v;
      });
      return labels.join(", ");
    }
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  // If it's a decision node, try to get the label
  if (node && "options" in node && node.options) {
    const opt = node.options.find((o) => o.value === String(value));
    if (opt?.label) return opt.label;
  }

  return String(value);
}

// Node type icon component
function NodeTypeIcon({ type }: { type?: string }) {
  const iconClass = "w-4 h-4 mt-0.5 shrink-0";

  switch (type) {
    case "decision":
      return <GitBranch className={`${iconClass} text-yellow-600`} />;
    case "step":
      return <FileText className={`${iconClass} text-blue-600`} />;
    case "text":
      return <Type className={`${iconClass} text-green-600`} />;
    case "checklist":
      return <CheckSquare className={`${iconClass} text-purple-600`} />;
    case "computed":
      return <Calculator className={`${iconClass} text-orange-600`} />;
    case "review":
      return <ClipboardCheck className={`${iconClass} text-pink-600`} />;
    default:
      return <FileText className={`${iconClass} text-gray-400`} />;
  }
}
