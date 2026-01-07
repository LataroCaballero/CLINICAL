'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Calculator } from 'lucide-react';
import type { ComputedNode } from '@/types/hc-templates';

interface FlowComputedNodeData {
  node: ComputedNode;
  selected?: boolean;
}

function FlowComputedNodeComponent({ data }: NodeProps<FlowComputedNodeData>) {
  const { node } = data;

  return (
    <div
      className={`
        bg-white border-2 border-orange-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center">
            <Calculator className="w-3 h-3 text-orange-600" />
          </div>
          <span className="text-xs font-medium text-orange-600 uppercase">
            Presupuesto
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Cálculo automático'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Genera presupuesto
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-orange-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowComputedNode = memo(FlowComputedNodeComponent);
