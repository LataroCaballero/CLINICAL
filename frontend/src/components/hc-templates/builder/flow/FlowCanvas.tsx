'use client';

import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodes';
import type { TemplateNode, TemplateEdge } from '@/types/hc-templates';

interface FlowCanvasProps {
  templateNodes: TemplateNode[];
  templateEdges: TemplateEdge[];
  selectedNodeId: string | null;
  onNodesChange: (nodes: TemplateNode[]) => void;
  onEdgesChange: (edges: TemplateEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onEdgeClick?: (edge: TemplateEdge) => void;
}

// Convert TemplateNode[] to ReactFlow Node[]
function templateNodesToFlow(
  nodes: TemplateNode[],
  selectedNodeId: string | null
): Node[] {
  return nodes.map((node, index) => ({
    id: node.id,
    type: node.type,
    position: node.position || { x: 250, y: index * 120 },
    data: {
      node,
      selected: node.id === selectedNodeId,
    },
  }));
}

// Convert TemplateEdge[] to ReactFlow Edge[]
function templateEdgesToFlow(edges: TemplateEdge[]): Edge[] {
  return edges.map((edge, index) => ({
    id: `edge-${index}-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    type: 'smoothstep',
    animated: !!edge.when,
    style: edge.when
      ? { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' }
      : { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.when ? '#6366f1' : '#94a3b8',
    },
    label: edge.when?.eq
      ? `${edge.when.eq[0]} = "${edge.when.eq[1]}"`
      : undefined,
    labelStyle: { fill: '#6366f1', fontWeight: 500, fontSize: 11 },
    labelBgStyle: { fill: '#f0f0ff', fillOpacity: 0.9 },
    labelBgPadding: [4, 4] as [number, number],
    labelBgBorderRadius: 4,
    data: { templateEdge: edge },
  }));
}

// Convert ReactFlow Node[] back to TemplateNode[]
function flowNodesToTemplate(
  flowNodes: Node[],
  originalNodes: TemplateNode[]
): TemplateNode[] {
  return flowNodes.map((flowNode) => {
    const original = originalNodes.find((n) => n.id === flowNode.id);
    if (!original) {
      throw new Error(`Node ${flowNode.id} not found in original nodes`);
    }
    return {
      ...original,
      position: flowNode.position,
    };
  });
}

// Convert ReactFlow Edge[] back to TemplateEdge[]
function flowEdgesToTemplate(
  flowEdges: Edge[],
  originalEdges: TemplateEdge[]
): TemplateEdge[] {
  return flowEdges.map((flowEdge) => {
    // Try to find original edge to preserve condition
    const original = originalEdges.find(
      (e) => e.from === flowEdge.source && e.to === flowEdge.target
    );
    return {
      from: flowEdge.source,
      to: flowEdge.target,
      when: original?.when,
    };
  });
}

export function FlowCanvas({
  templateNodes,
  templateEdges,
  selectedNodeId,
  onNodesChange: onTemplateNodesChange,
  onEdgesChange: onTemplateEdgesChange,
  onNodeSelect,
  onEdgeClick,
}: FlowCanvasProps) {
  const initialNodes = useMemo(
    () => templateNodesToFlow(templateNodes, selectedNodeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const initialEdges = useMemo(
    () => templateEdgesToFlow(templateEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external changes to internal state
  useEffect(() => {
    setNodes(templateNodesToFlow(templateNodes, selectedNodeId));
  }, [templateNodes, selectedNodeId, setNodes]);

  useEffect(() => {
    setEdges(templateEdgesToFlow(templateEdges));
  }, [templateEdges, setEdges]);

  // Handle node position changes (drag)
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Only update template nodes if position changed
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.dragging === false
      );
      if (positionChanges.length > 0) {
        // Use the latest nodes state
        setNodes((currentNodes) => {
          const updated = flowNodesToTemplate(currentNodes, templateNodes);
          onTemplateNodesChange(updated);
          return currentNodes;
        });
      }
    },
    [onNodesChange, templateNodes, onTemplateNodesChange, setNodes]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);

      // Update template edges on remove
      const removeChanges = changes.filter((c) => c.type === 'remove');
      if (removeChanges.length > 0) {
        setEdges((currentEdges) => {
          const updated = flowEdgesToTemplate(currentEdges, templateEdges);
          onTemplateEdgesChange(updated);
          return currentEdges;
        });
      }
    },
    [onEdgesChange, templateEdges, onTemplateEdgesChange, setEdges]
  );

  // Handle new connection
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const newEdge: TemplateEdge = {
        from: params.source,
        to: params.target,
      };

      onTemplateEdgesChange([...templateEdges, newEdge]);
    },
    [templateEdges, onTemplateEdgesChange]
  );

  // Handle node click
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Handle edge click
  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      if (onEdgeClick && edge.data?.templateEdge) {
        onEdgeClick(edge.data.templateEdge);
      }
    },
    [onEdgeClick]
  );

  return (
    <div className="w-full h-full min-h-[500px] bg-gray-50 rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        connectionLineStyle={{ strokeDasharray: '0', strokeLinejoin: 'round' }}
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background gap={15} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            const colors: Record<string, string> = {
              decision: '#eab308',
              step: '#3b82f6',
              text: '#22c55e',
              checklist: '#a855f7',
              computed: '#f97316',
              review: '#ec4899',
            };
            return colors[n.type || ''] || '#94a3b8';
          }}
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              decision: '#fef9c3',
              step: '#dbeafe',
              text: '#dcfce7',
              checklist: '#f3e8ff',
              computed: '#ffedd5',
              review: '#fce7f3',
            };
            return colors[n.type || ''] || '#f1f5f9';
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
