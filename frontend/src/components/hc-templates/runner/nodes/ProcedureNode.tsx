'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProcedureNode as ProcedureNodeType } from '@/types/hc-templates';
import type { TratamientoSeleccionado } from '@/types/tratamiento';

interface ProcedureData {
  comments: Record<string, string>;
}

interface ProcedureNodeProps {
  node: ProcedureNodeType;
  value: ProcedureData | undefined;
  onChange: (value: ProcedureData) => void;
  answers: Record<string, unknown>;
}

export function ProcedureNode({ node, value, onChange, answers }: ProcedureNodeProps) {
  const showIndicaciones = node.ui?.showIndicaciones !== false;
  const showProcedimiento = node.ui?.showProcedimiento !== false;
  const allowComments = node.ui?.allowComments !== false;

  // Get selected treatments from the source node
  const sourceTreatments = (answers[node.sourceNodeKey] || []) as TratamientoSeleccionado[];

  const handleCommentChange = (tratamientoId: string, comment: string) => {
    onChange({
      comments: {
        ...(value?.comments || {}),
        [tratamientoId]: comment,
      },
    });
  };

  if (sourceTreatments.length === 0) {
    // Find keys in answers that look like treatment data (arrays with tratamientoId)
    const possibleTreatmentKeys = Object.entries(answers)
      .filter(([, val]) => Array.isArray(val) && val.length > 0 && (val[0] as Record<string, unknown>)?.tratamientoId)
      .map(([key]) => key);

    return (
      <div className="space-y-3">
        <Label>{node.title}</Label>
        <p className="text-sm text-muted-foreground">
          No hay tratamientos seleccionados. Seleccioná tratamientos en el paso anterior.
        </p>
        <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/50 rounded">
          <p>
            <strong>sourceNodeKey configurado:</strong>{' '}
            {node.sourceNodeKey ? `"${node.sourceNodeKey}"` : '(vacío - debe configurarse en el builder)'}
          </p>
          {possibleTreatmentKeys.length > 0 && (
            <p>
              <strong>Keys con tratamientos disponibles:</strong> {possibleTreatmentKeys.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>{node.title}</Label>

      <div className="space-y-4">
        {sourceTreatments.map((tratamiento) => (
          <Card key={tratamiento.tratamientoId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{tratamiento.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {showIndicaciones && tratamiento.indicaciones && (
                <div>
                  <Label className="text-sm text-muted-foreground">Indicaciones</Label>
                  <div className="mt-1 p-3 bg-cyan-50 rounded-md text-sm whitespace-pre-wrap">
                    {tratamiento.indicaciones}
                  </div>
                </div>
              )}

              {showProcedimiento && tratamiento.procedimiento && (
                <div>
                  <Label className="text-sm text-muted-foreground">Procedimiento</Label>
                  <div className="mt-1 p-3 bg-cyan-50 rounded-md text-sm whitespace-pre-wrap">
                    {tratamiento.procedimiento}
                  </div>
                </div>
              )}

              {!tratamiento.indicaciones && !tratamiento.procedimiento && (
                <p className="text-sm text-muted-foreground italic">
                  No hay información adicional para este tratamiento.
                </p>
              )}

              {allowComments && (
                <div>
                  <Label className="text-sm">Comentarios / Notas</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Agregar comentarios sobre este tratamiento..."
                    value={value?.comments?.[tratamiento.tratamientoId] || ''}
                    onChange={(e) =>
                      handleCommentChange(tratamiento.tratamientoId, e.target.value)
                    }
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
