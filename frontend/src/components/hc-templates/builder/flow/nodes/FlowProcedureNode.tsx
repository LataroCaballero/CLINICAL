'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { ClipboardList } from 'lucide-react';
import type { ProcedureNode } from '@/types/hc-templates';

interface FlowProcedureNodeData {
  node: ProcedureNode;
  selected?: boolean;
}

function FlowProcedureNodeComponent({ data }: NodeProps<FlowProcedureNodeData>) {
  const { node } = data;

  return (
    <div
      className={`
        bg-white border-2 border-cyan-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-cyan-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-cyan-100 flex items-center justify-center">
            <ClipboardList className="w-3 h-3 text-cyan-600" />
          </div>
          <span className="text-xs font-medium text-cyan-600 uppercase">
            Procedimiento
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
        {node.ui?.allowComments && (
          <p className="text-xs text-cyan-500 mt-1">
            Con comentarios
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-cyan-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowProcedureNode = memo(FlowProcedureNodeComponent);
