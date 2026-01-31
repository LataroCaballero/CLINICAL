'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Pencil } from 'lucide-react';
import type { DrawingNode } from '@/types/hc-templates';

interface FlowDrawingNodeData {
  node: DrawingNode;
  selected?: boolean;
}

function FlowDrawingNodeComponent({ data }: NodeProps<FlowDrawingNodeData>) {
  const { node } = data;

  return (
    <div
      className={`
        bg-white border-2 border-teal-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-teal-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center">
            <Pencil className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-xs font-medium text-teal-600 uppercase">
            Dibujo
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {node.ui?.width || 400}x{node.ui?.height || 300}px
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-teal-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowDrawingNode = memo(FlowDrawingNodeComponent);
