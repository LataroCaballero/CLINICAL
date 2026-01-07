'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import type { DecisionNode } from '@/types/hc-templates';

interface FlowDecisionNodeData {
  node: DecisionNode;
  selected?: boolean;
}

function FlowDecisionNodeComponent({ data }: NodeProps<FlowDecisionNodeData>) {
  const { node } = data;
  const optionsCount = node.options?.length || 0;

  return (
    <div
      className={`
        bg-white border-2 border-yellow-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-yellow-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-yellow-100 flex items-center justify-center">
            <GitBranch className="w-3 h-3 text-yellow-600" />
          </div>
          <span className="text-xs font-medium text-yellow-600 uppercase">
            Decisión
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        {optionsCount > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {optionsCount} {optionsCount === 1 ? 'opción' : 'opciones'}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-yellow-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowDecisionNode = memo(FlowDecisionNodeComponent);
