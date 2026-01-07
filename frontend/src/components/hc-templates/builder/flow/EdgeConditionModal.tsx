'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TemplateEdge, TemplateNode, DecisionNode } from '@/types/hc-templates';

interface EdgeConditionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edge: TemplateEdge | null;
  nodes: TemplateNode[];
  onSave: (edge: TemplateEdge) => void;
  onDelete: (edge: TemplateEdge) => void;
}

export function EdgeConditionModal({
  open,
  onOpenChange,
  edge,
  nodes,
  onSave,
  onDelete,
}: EdgeConditionModalProps) {
  const [conditionKey, setConditionKey] = useState<string>('');
  const [conditionValue, setConditionValue] = useState<string>('');

  // Get decision nodes for condition keys
  const decisionNodes = nodes.filter(
    (n): n is DecisionNode => n.type === 'decision'
  );

  // Get the selected decision node to show its options
  const selectedDecisionNode = decisionNodes.find((n) => n.key === conditionKey);

  // Initialize state when edge changes
  useEffect(() => {
    if (edge?.when?.eq) {
      setConditionKey(edge.when.eq[0] || '');
      setConditionValue(edge.when.eq[1] || '');
    } else {
      setConditionKey('');
      setConditionValue('');
    }
  }, [edge]);

  if (!edge) return null;

  const fromNode = nodes.find((n) => n.id === edge.from);
  const toNode = nodes.find((n) => n.id === edge.to);

  const handleSave = () => {
    const updatedEdge: TemplateEdge = {
      from: edge.from,
      to: edge.to,
      when: conditionKey && conditionValue
        ? { eq: [conditionKey, conditionValue] }
        : undefined,
    };
    onSave(updatedEdge);
    onOpenChange(false);
  };

  const handleClearCondition = () => {
    setConditionKey('');
    setConditionValue('');
  };

  const handleDelete = () => {
    onDelete(edge);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar conexión</DialogTitle>
          <DialogDescription>
            Configurá la condición para esta conexión entre nodos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
            <span className="font-medium truncate flex-1">
              {fromNode?.title || edge.from}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium truncate flex-1 text-right">
              {toNode?.title || edge.to}
            </span>
          </div>

          {/* Condition editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Condición (opcional)</Label>
              {(conditionKey || conditionValue) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleClearCondition}
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cuando</Label>
                <Select value={conditionKey} onValueChange={setConditionKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar campo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {decisionNodes.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No hay nodos de decisión
                      </SelectItem>
                    ) : (
                      decisionNodes.map((node) => (
                        <SelectItem key={node.id} value={node.key}>
                          {node.title || node.key}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Es igual a</Label>
                {selectedDecisionNode && selectedDecisionNode.options.length > 0 ? (
                  <Select value={conditionValue} onValueChange={setConditionValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar valor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDecisionNode.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label || opt.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="Valor..."
                  />
                )}
              </div>
            </div>

            {!conditionKey && !conditionValue && (
              <p className="text-xs text-muted-foreground">
                Sin condición, esta conexión siempre se seguirá.
              </p>
            )}

            {conditionKey && conditionValue && (
              <p className="text-xs text-muted-foreground">
                Esta conexión se seguirá cuando{' '}
                <code className="bg-muted px-1 rounded">{conditionKey}</code>
                {' = '}
                <code className="bg-muted px-1 rounded">&quot;{conditionValue}&quot;</code>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Eliminar conexión
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
