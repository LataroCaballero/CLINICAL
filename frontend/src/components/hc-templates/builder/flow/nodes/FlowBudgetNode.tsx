'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Receipt } from 'lucide-react';
import type { BudgetNode } from '@/types/hc-templates';

interface FlowBudgetNodeData {
  node: BudgetNode;
  selected?: boolean;
}

function FlowBudgetNodeComponent({ data }: NodeProps<FlowBudgetNodeData>) {
  const { node } = data;

  return (
    <div
      className={`
        bg-white border-2 border-amber-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
            <Receipt className="w-3 h-3 text-amber-600" />
          </div>
          <span className="text-xs font-medium text-amber-600 uppercase">
            Presupuesto
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        {node.sourceNodeKey && (
          <p className="text-xs text-gray-500 mt-1">
            Fuente: {node.sourceNodeKey}
          </p>
        )}
        {node.createPresupuesto && (
          <p className="text-xs text-amber-500 mt-1">
            Crea presupuesto
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowBudgetNode = memo(FlowBudgetNodeComponent);
