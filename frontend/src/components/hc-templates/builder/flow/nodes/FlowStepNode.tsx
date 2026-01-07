'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import type { StepNode } from '@/types/hc-templates';

interface FlowStepNodeData {
  node: StepNode;
  selected?: boolean;
}

function FlowStepNodeComponent({ data }: NodeProps<FlowStepNodeData>) {
  const { node } = data;
  const fieldsCount = node.fields?.length || 0;

  return (
    <div
      className={`
        bg-white border-2 border-blue-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
            <FileText className="w-3 h-3 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-600 uppercase">
            Formulario
          </span>
        </div>
        <p className="font-medium text-sm text-gray-800 truncate">
          {node.title || 'Sin título'}
        </p>
        {fieldsCount > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {fieldsCount} {fieldsCount === 1 ? 'campo' : 'campos'}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowStepNode = memo(FlowStepNodeComponent);
