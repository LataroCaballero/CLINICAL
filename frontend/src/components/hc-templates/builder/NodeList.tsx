'use client';

import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TemplateNode, NodeType } from '@/types/hc-templates';

interface NodeListProps {
  nodes: TemplateNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onAddNode: (type: NodeType) => void;
  onRemoveNode: (nodeId: string) => void;
  onReorderNodes: (nodes: TemplateNode[]) => void;
}

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  decision: 'Decisión',
  step: 'Paso',
  text: 'Texto',
  checklist: 'Checklist',
  computed: 'Presupuesto',
  review: 'Revisión',
};

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  decision: 'border-l-yellow-500',
  step: 'border-l-blue-500',
  text: 'border-l-green-500',
  checklist: 'border-l-purple-500',
  computed: 'border-l-orange-500',
  review: 'border-l-pink-500',
};

export function NodeList({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddNode,
  onRemoveNode,
}: NodeListProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm">Nodos</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddNode('decision')}>
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              Decisión
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('step')}>
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              Paso (Formulario)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('text')}>
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              Texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('checklist')}>
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
              Checklist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('computed')}>
              <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
              Presupuesto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('review')}>
              <div className="w-2 h-2 rounded-full bg-pink-500 mr-2" />
              Revisión Final
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay nodos. Agregá uno para comenzar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nodes.map((node, index) => (
            <Card
              key={node.id}
              className={cn(
                'cursor-pointer border-l-4 transition-colors',
                NODE_TYPE_COLORS[node.type],
                selectedNodeId === node.id
                  ? 'ring-2 ring-primary'
                  : 'hover:bg-muted/50'
              )}
              onClick={() => onSelectNode(node.id)}
            >
              <CardContent className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-medium text-sm truncate">
                        {node.title || 'Sin título'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {NODE_TYPE_LABELS[node.type]}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveNode(node.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
