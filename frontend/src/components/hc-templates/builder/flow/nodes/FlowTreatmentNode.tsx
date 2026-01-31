'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Pill } from 'lucide-react';
import type { TreatmentNode } from '@/types/hc-templates';

interface FlowTreatmentNodeData {
  node: TreatmentNode;
  selected?: boolean;
}

function FlowTreatmentNodeComponent({ data }: NodeProps<FlowTreatmentNodeData>) {
  const { node } = data;
  const treatmentsCount = node.treatmentIds?.length || 0;

  return (
    <div
      className={`
        bg-white border-2 border-emerald-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-emerald-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
            <Pill className="w-3 h-3 text-emerald-600" />
          </div>
          <span className="text-xs font-medium text-emerald-600 uppercase">
            Tratamiento
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {treatmentsCount > 0
            ? `${treatmentsCount} tratamientos filtrados`
            : 'Todos los tratamientos'}
        </p>
        {node.ui?.multiSelect && (
          <p className="text-xs text-emerald-500 mt-1">
            Multi-selección
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowTreatmentNode = memo(FlowTreatmentNodeComponent);
