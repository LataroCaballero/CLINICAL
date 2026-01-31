'use client';

import { useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, Save, Check, Loader2, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  useTemplateWizardStore,
  useCurrentNode,
  useWizardProgress,
} from '@/store/template-wizard.store';
import { useUpdateHCEntryAnswers, useFinalizeHCEntry } from '@/hooks/useHCEntries';
import { DecisionNode } from './nodes/DecisionNode';
import { StepNode } from './nodes/StepNode';
import { TextNode } from './nodes/TextNode';
import { ChecklistNode } from './nodes/ChecklistNode';
import { ComputedNode } from './nodes/ComputedNode';
import { ReviewNode } from './nodes/ReviewNode';
import { DrawingNode } from './nodes/DrawingNode';
import { DiagnosisNode } from './nodes/DiagnosisNode';
import { TreatmentNode } from './nodes/TreatmentNode';
import { ProcedureNode } from './nodes/ProcedureNode';
import { BudgetNode } from './nodes/BudgetNode';
import type {
  TemplateSchema,
  DecisionNode as DecisionNodeType,
  StepNode as StepNodeType,
  TextNode as TextNodeType,
  ChecklistNode as ChecklistNodeType,
  ComputedNode as ComputedNodeType,
  ReviewNode as ReviewNodeType,
  DrawingNode as DrawingNodeType,
  DiagnosisNode as DiagnosisNodeType,
  TreatmentNode as TreatmentNodeType,
  ProcedureNode as ProcedureNodeType,
  BudgetNode as BudgetNodeType,
} from '@/types/hc-templates';

interface DynamicTemplateWizardProps {
  entryId: string;
  pacienteId: string;
  schema: TemplateSchema;
  initialAnswers?: Record<string, unknown>;
  initialComputed?: Record<string, unknown>;
  onClose: () => void;
  onFinalize: () => void;
}

export function DynamicTemplateWizard({
  entryId,
  pacienteId,
  schema,
  initialAnswers,
  initialComputed,
  onClose,
  onFinalize,
}: DynamicTemplateWizardProps) {
  const updateMutation = useUpdateHCEntryAnswers();
  const finalizeMutation = useFinalizeHCEntry();

  const {
    initWizard,
    answers,
    computed,
    setAnswer,
    goToNextNode,
    goBack,
    nodeHistory,
    isDirty,
    isSaving,
    markSaving,
    markSaved,
    templateSchema,
  } = useTemplateWizardStore();

  const currentNode = useCurrentNode();
  const progress = useWizardProgress();

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Initialize wizard only once on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initWizard({
      entryId,
      pacienteId,
      schema,
      initialAnswers,
      initialComputed,
    });
  }, [entryId, pacienteId, schema, initialAnswers, initialComputed, initWizard]);

  // Debounced autosave
  const saveAnswers = useCallback(async () => {
    if (!isDirty) return;

    markSaving();
    try {
      await updateMutation.mutateAsync({
        pacienteId,
        entryId,
        dto: { answers, computed },
      });
      markSaved();
    } catch {
      toast.error('Error al guardar', {
        description: 'No se pudieron guardar los cambios. Intentá de nuevo.',
      });
    }
  }, [pacienteId, entryId, answers, computed, isDirty, markSaving, markSaved, updateMutation]);

  // Trigger autosave on changes
  useEffect(() => {
    if (!isDirty) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveAnswers();
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, saveAnswers]);

  // Handle answer change
  const handleAnswerChange = useCallback(
    (key: string, value: unknown) => {
      setAnswer(key, value);
    },
    [setAnswer]
  );

  // Handle next
  const handleNext = async () => {
    // Save first
    if (isDirty) {
      await saveAnswers();
    }
    goToNextNode();
  };

  // Handle finalize
  const handleFinalize = async () => {
    // Save first
    if (isDirty) {
      await saveAnswers();
    }

    try {
      await finalizeMutation.mutateAsync({ pacienteId, entryId });
      toast.success('Entrada finalizada');
      onFinalize();
    } catch {
      toast.error('Error al finalizar');
    }
  };

  if (!templateSchema || !currentNode) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  const isFirstNode = nodeHistory.length <= 1;
  const isLastNode = currentNode.type === 'review';
  const canGoNext = !isLastNode;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{schema.name}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando...
              </>
            ) : isDirty ? (
              <>
                <Cloud className="h-3 w-3" />
                Sin guardar
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Guardado
              </>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Paso {progress.current} de ~{progress.total}</span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="min-h-[300px]">
        {renderNode(currentNode, answers, computed, templateSchema, handleAnswerChange)}
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {!isFirstNode && (
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Atrás
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {!isLastNode && (
            <Button variant="outline" onClick={saveAnswers} disabled={!isDirty || isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          )}

          {canGoNext ? (
            <Button onClick={handleNext}>
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Finalizar
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function renderNode(
  node: NonNullable<ReturnType<typeof useCurrentNode>>,
  answers: Record<string, unknown>,
  computed: Record<string, unknown>,
  schema: TemplateSchema,
  onChange: (key: string, value: unknown) => void
) {
  switch (node.type) {
    case 'decision':
      return (
        <DecisionNode
          node={node as DecisionNodeType}
          value={answers[(node as DecisionNodeType).key] as string | string[]}
          onChange={(value) => onChange((node as DecisionNodeType).key, value)}
        />
      );

    case 'step':
      return (
        <StepNode
          node={node as StepNodeType}
          values={answers}
          onChange={onChange}
        />
      );

    case 'text':
      return (
        <TextNode
          node={node as TextNodeType}
          value={answers[(node as TextNodeType).key] as string}
          onChange={(value) => onChange((node as TextNodeType).key, value)}
        />
      );

    case 'checklist':
      return (
        <ChecklistNode
          node={node as ChecklistNodeType}
          values={answers[(node as ChecklistNodeType).key] as string[] || []}
          onChange={(values) => onChange((node as ChecklistNodeType).key, values)}
        />
      );

    case 'computed':
      return (
        <ComputedNode
          node={node as ComputedNodeType}
          computed={computed as Parameters<typeof ComputedNode>[0]['computed']}
          answers={answers}
        />
      );

    case 'review':
      return (
        <ReviewNode
          node={node as ReviewNodeType}
          schema={schema}
          answers={answers}
          computed={computed}
        />
      );

    case 'drawing':
      return (
        <DrawingNode
          node={node as DrawingNodeType}
          value={answers[(node as DrawingNodeType).key] as string}
          onChange={(value) => onChange((node as DrawingNodeType).key, value)}
        />
      );

    case 'diagnosis':
      return (
        <DiagnosisNode
          node={node as DiagnosisNodeType}
          value={answers[(node as DiagnosisNodeType).key] as string | { value: string; otherText?: string }}
          onChange={(value) => onChange((node as DiagnosisNodeType).key, value)}
        />
      );

    case 'treatment':
      return (
        <TreatmentNode
          node={node as TreatmentNodeType}
          value={answers[(node as TreatmentNodeType).key] as Parameters<typeof TreatmentNode>[0]['value']}
          onChange={(value) => onChange((node as TreatmentNodeType).key, value)}
        />
      );

    case 'procedure':
      return (
        <ProcedureNode
          node={node as ProcedureNodeType}
          value={answers[(node as ProcedureNodeType).key] as Parameters<typeof ProcedureNode>[0]['value']}
          onChange={(value) => onChange((node as ProcedureNodeType).key, value)}
          answers={answers}
        />
      );

    case 'budget':
      return (
        <BudgetNode
          node={node as BudgetNodeType}
          value={answers[(node as BudgetNodeType).key] as Parameters<typeof BudgetNode>[0]['value']}
          onChange={(value) => onChange((node as BudgetNodeType).key, value)}
          answers={answers}
        />
      );

    default:
      return <p>Tipo de nodo no soportado</p>;
  }
}
