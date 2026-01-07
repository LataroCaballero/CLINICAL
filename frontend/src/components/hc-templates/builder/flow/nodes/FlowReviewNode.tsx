'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { ClipboardCheck } from 'lucide-react';
import type { ReviewNode } from '@/types/hc-templates';

interface FlowReviewNodeData {
  node: ReviewNode;
  selected?: boolean;
}

function FlowReviewNodeComponent({ data }: NodeProps<FlowReviewNodeData>) {
  const { node } = data;

  return (
    <div
      className={`
        bg-white border-2 border-pink-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-pink-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-pink-100 flex items-center justify-center">
            <ClipboardCheck className="w-3 h-3 text-pink-600" />
          </div>
          <span className="text-xs font-medium text-pink-600 uppercase">
            Revisión
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Revisión Final'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Resumen y confirmación
        </p>
      </div>

      {/* Review node typically doesn't have outgoing edges */}
    </div>
  );
}

export const FlowReviewNode = memo(FlowReviewNodeComponent);
