'use client';

import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TemplateEdge, TemplateNode, DecisionNode } from '@/types/hc-templates';

interface EdgeEditorProps {
  edges: TemplateEdge[];
  nodes: TemplateNode[];
  onUpdate: (edges: TemplateEdge[]) => void;
}

export function EdgeEditor({ edges, nodes, onUpdate }: EdgeEditorProps) {
  const addEdge = () => {
    const newEdge: TemplateEdge = {
      from: nodes[0]?.id || '',
      to: nodes[1]?.id || '',
    };
    onUpdate([...edges, newEdge]);
  };

  const updateEdge = (index: number, field: keyof TemplateEdge, value: unknown) => {
    const newEdges = [...edges];
    newEdges[index] = { ...newEdges[index], [field]: value };
    onUpdate(newEdges);
  };

  const removeEdge = (index: number) => {
    onUpdate(edges.filter((_, i) => i !== index));
  };

  // Get all decision nodes for condition keys
  const decisionNodes = nodes.filter((n) => n.type === 'decision') as DecisionNode[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Conexiones (Edges)</CardTitle>
          <Button variant="outline" size="sm" onClick={addEdge} disabled={nodes.length < 2}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {edges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay conexiones. Agregá una para definir el flujo.
          </p>
        ) : (
          edges.map((edge, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={edge.from}
                    onValueChange={(value) => updateEdge(index, 'from', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Desde..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.title || node.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

                  <Select
                    value={edge.to}
                    onValueChange={(value) => updateEdge(index, 'to', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Hacia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.title || node.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEdge(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Condition (optional) */}
                <div className="flex items-center gap-2 text-sm">
                  <Label className="shrink-0">Cuando:</Label>
                  <Select
                    value={edge.when?.eq?.[0] || '__none__'}
                    onValueChange={(value) => {
                      if (value === '__none__') {
                        updateEdge(index, 'when', undefined);
                      } else {
                        updateEdge(index, 'when', {
                          eq: [value, edge.when?.eq?.[1] || ''],
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Campo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(Sin condición)</SelectItem>
                      {decisionNodes.map((node) => (
                        <SelectItem key={node.id} value={node.key}>
                          {node.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {edge.when?.eq && (
                    <>
                      <span>=</span>
                      <Input
                        value={edge.when.eq[1] || ''}
                        onChange={(e) =>
                          updateEdge(index, 'when', {
                            eq: [edge.when!.eq![0], e.target.value],
                          })
                        }
                        placeholder="Valor"
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}

        {edges.length > 0 && (
          <p className="text-xs text-muted-foreground">
            El primer edge que cumpla la condición determinará el siguiente nodo.
            Si no hay condición, el edge siempre aplica.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
