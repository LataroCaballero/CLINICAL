'use client';

import {
  GitBranch,
  FileText,
  Type,
  CheckSquare,
  ClipboardCheck,
  Pencil,
  Stethoscope,
  Pill,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NodeType } from '@/types/hc-templates';

interface AddNodeToolbarProps {
  onAddNode: (type: NodeType) => void;
  disabled?: boolean;
}

const nodeTypeConfig: Array<{
  type: NodeType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = [
  {
    type: 'decision',
    label: 'Decisión',
    description: 'Pregunta con opciones',
    icon: GitBranch,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 hover:bg-yellow-200',
  },
  {
    type: 'step',
    label: 'Formulario',
    description: 'Múltiples campos',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
  },
  {
    type: 'text',
    label: 'Texto',
    description: 'Campo de texto libre',
    icon: Type,
    color: 'text-green-600',
    bgColor: 'bg-green-100 hover:bg-green-200',
  },
  {
    type: 'checklist',
    label: 'Checklist',
    description: 'Lista de verificación',
    icon: CheckSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 hover:bg-purple-200',
  },
  {
    type: 'review',
    label: 'Revisión',
    description: 'Resumen final',
    icon: ClipboardCheck,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 hover:bg-pink-200',
  },
  {
    type: 'drawing',
    label: 'Dibujo',
    description: 'Canvas para dibujar',
    icon: Pencil,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 hover:bg-teal-200',
  },
  {
    type: 'diagnosis',
    label: 'Diagnóstico',
    description: 'Selección de diagnóstico',
    icon: Stethoscope,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
  },
  {
    type: 'treatment',
    label: 'Tratamiento',
    description: 'Selección de tratamientos',
    icon: Pill,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 hover:bg-emerald-200',
  },
  {
    type: 'procedure',
    label: 'Procedimiento',
    description: 'Info de tratamientos',
    icon: ClipboardList,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 hover:bg-cyan-200',
  },
  {
    type: 'budget',
    label: 'Presupuesto',
    description: 'Genera presupuesto',
    icon: Receipt,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 hover:bg-amber-200',
  },
];

export function AddNodeToolbar({ onAddNode, disabled }: AddNodeToolbarProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Agregar nodo
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {nodeTypeConfig.map((config) => {
          const Icon = config.icon;
          return (
            <Button
              key={config.type}
              variant="ghost"
              className={`h-auto p-2 flex flex-col items-start gap-1 ${config.bgColor} border border-transparent hover:border-current/20`}
              onClick={() => onAddNode(config.type)}
              disabled={disabled}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {config.description}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
