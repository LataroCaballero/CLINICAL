'use client';

import { useState } from 'react';
import { FileText, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useHCTemplates } from '@/hooks/useHCTemplates';
import { useCreateHCEntry, useHCEntry } from '@/hooks/useHCEntries';
import { DynamicTemplateWizard } from '@/components/hc-templates/runner/DynamicTemplateWizard';

export function HistoriaClinicaTab() {
  const { session, draftData, setDraftData } = useLiveTurnoStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data: templates, isLoading: loadingTemplates } = useHCTemplates();
  const createEntry = useCreateHCEntry();
  const { data: existingEntry } = useHCEntry(
    session?.pacienteId || null,
    draftData.hcEntryId || null
  );

  if (!session) return null;

  const handleCreateEntry = async () => {
    if (!selectedTemplateId) return;

    const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
    if (!selectedTemplate?.currentVersion) return;

    try {
      const entry = await createEntry.mutateAsync({
        pacienteId: session.pacienteId,
        dto: {
          templateId: selectedTemplateId,
          templateVersionId: selectedTemplate.currentVersion.id,
        },
      });
      setDraftData('hcEntryId', entry.id);
      setIsWizardOpen(true);
    } catch (error) {
      console.error('Error al crear entrada HC:', error);
    }
  };

  const handleOpenExistingEntry = () => {
    if (draftData.hcEntryId) {
      setIsWizardOpen(true);
    }
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
  };

  const handleWizardFinalize = () => {
    setIsWizardOpen(false);
  };

  // Get template for existing entry
  const entryTemplate = existingEntry?.template;
  const entrySchema = existingEntry?.templateVersion?.schema;

  if (isWizardOpen && draftData.hcEntryId && entrySchema) {
    return (
      <DynamicTemplateWizard
        entryId={draftData.hcEntryId}
        pacienteId={session.pacienteId}
        schema={entrySchema}
        initialAnswers={existingEntry?.answers as Record<string, unknown>}
        initialComputed={existingEntry?.computed as Record<string, unknown>}
        onClose={handleWizardClose}
        onFinalize={handleWizardFinalize}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Nueva Entrada de Historia Clinica
          </CardTitle>
          <CardDescription>
            Crea una nueva entrada de historia clinica para esta consulta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {draftData.hcEntryId ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Entrada creada: {entryTemplate?.nombre || 'Cargando...'}
                  </span>
                </div>
                <Button onClick={handleOpenExistingEntry}>
                  Continuar editando
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Seleccionar plantilla
                </label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateEntry}
                disabled={!selectedTemplateId || createEntry.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear entrada
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
