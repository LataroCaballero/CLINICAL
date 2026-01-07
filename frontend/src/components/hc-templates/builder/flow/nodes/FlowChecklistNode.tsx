'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { CheckSquare } from 'lucide-react';
import type { ChecklistNode } from '@/types/hc-templates';

interface FlowChecklistNodeData {
  node: ChecklistNode;
  selected?: boolean;
}

function FlowChecklistNodeComponent({ data }: NodeProps<FlowChecklistNodeData>) {
  const { node } = data;
  const itemsCount = node.items?.length || 0;

  return (
    <div
      className={`
        bg-white border-2 border-purple-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
            <CheckSquare className="w-3 h-3 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-purple-600 uppercase">
            Checklist
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        {itemsCount > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowChecklistNode = memo(FlowChecklistNodeComponent);
