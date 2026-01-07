'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Type } from 'lucide-react';
import type { TextNode } from '@/types/hc-templates';

interface FlowTextNodeData {
  node: TextNode;
  selected?: boolean;
}

function FlowTextNodeComponent({ data }: NodeProps<FlowTextNodeData>) {
  const { node } = data;

  return (
    <div
      className={`
        bg-white border-2 border-green-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-green-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
            <Type className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-xs font-medium text-green-600 uppercase">
            Texto
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        {node.placeholder && (
          <p className="text-xs text-gray-400 mt-1 truncate italic">
            {node.placeholder}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowTextNode = memo(FlowTextNodeComponent);
