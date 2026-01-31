'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Stethoscope } from 'lucide-react';
import type { DiagnosisNode } from '@/types/hc-templates';

interface FlowDiagnosisNodeData {
  node: DiagnosisNode;
  selected?: boolean;
}

function FlowDiagnosisNodeComponent({ data }: NodeProps<FlowDiagnosisNodeData>) {
  const { node } = data;
  const optionsCount = node.options?.length || 0;

  return (
    <div
      className={`
        bg-white border-2 border-indigo-400 rounded-lg shadow-sm min-w-[180px]
        ${data.selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-indigo-500 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center">
            <Stethoscope className="w-3 h-3 text-indigo-600" />
          </div>
          <span className="text-xs font-medium text-indigo-600 uppercase">
            Diagnóstico
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
        {node.syncToPaciente && (
          <p className="text-xs text-indigo-500 mt-1">
            Sincroniza con paciente
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-indigo-500 !w-3 !h-3"
      />
    </div>
  );
}

export const FlowDiagnosisNode = memo(FlowDiagnosisNodeComponent);
