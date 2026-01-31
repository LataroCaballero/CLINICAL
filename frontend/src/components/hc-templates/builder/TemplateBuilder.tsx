'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  useHCTemplate,
  useUpdateHCTemplate,
  useCreateHCTemplateVersion,
  useUpdateHCTemplateVersion,
  usePublishHCTemplateVersion,
} from '@/hooks/useHCTemplates';
import { NodePropertiesEditor } from './NodePropertiesEditor';
import { FlowCanvas, AddNodeToolbar, EdgeConditionModal } from './flow';
import type {
  TemplateNode,
  TemplateEdge,
  TemplateSchema,
  NodeType,
} from '@/types/hc-templates';

interface TemplateBuilderProps {
  templateId: string;
  onBack: () => void;
}

export function TemplateBuilder({ templateId, onBack }: TemplateBuilderProps) {
  const { data: template, isLoading } = useHCTemplate(templateId);

  const updateTemplateMutation = useUpdateHCTemplate();
  const createVersionMutation = useCreateHCTemplateVersion();
  const updateVersionMutation = useUpdateHCTemplateVersion();
  const publishMutation = usePublishHCTemplateVersion();

  // Local state for editing
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<TemplateNode[]>([]);
  const [edges, setEdges] = useState<TemplateEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Edge condition modal state
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<TemplateEdge | null>(null);

  // Initialize state from template
  const templateInitialized = useRef(false);

  useEffect(() => {
    if (template && !templateInitialized.current) {
      templateInitialized.current = true;
      setNombre(template.nombre);
      setDescripcion(template.descripcion || '');

      // Select the latest version (draft or published)
      const latestVersion =
        template.versions?.length > 0 ? template.versions[0] : null;

      if (latestVersion) {
        setSelectedVersionId(latestVersion.id);
        const schema = latestVersion.schema as TemplateSchema;
        setNodes(schema.nodes || []);
        setEdges(schema.edges || []);
      }
    }
  }, [template]);

  const selectedVersion = template?.versions?.find(
    (v) => v.id === selectedVersionId
  );
  const isVersionPublished = !!selectedVersion?.publishedAt;

  const handleSaveMetadata = async () => {
    await updateTemplateMutation.mutateAsync({
      id: templateId,
      dto: { nombre, descripcion },
    });
    toast.success('Metadatos guardados');
  };

  const handleCreateVersion = async () => {
    const newVersion = await createVersionMutation.mutateAsync(templateId);
    setSelectedVersionId(newVersion.id);
    const schema = newVersion.schema as TemplateSchema;
    setNodes(schema.nodes || []);
    setEdges(schema.edges || []);
    setIsDirty(false);
    toast.success('Nueva versión creada');
  };

  const handleSaveSchema = useCallback(async () => {
    if (!selectedVersionId || isVersionPublished) return;

    const schema: TemplateSchema = {
      id: `template-${templateId}`,
      name: nombre,
      startNodeId: nodes[0]?.id || '',
      nodes,
      edges,
    };

    await updateVersionMutation.mutateAsync({
      templateId,
      versionId: selectedVersionId,
      schema,
    });

    setIsDirty(false);
    toast.success('Esquema guardado');
  }, [
    selectedVersionId,
    isVersionPublished,
    templateId,
    nombre,
    nodes,
    edges,
    updateVersionMutation,
  ]);

  const handlePublish = async () => {
    if (!selectedVersionId) return;

    // Save first if dirty
    if (isDirty) {
      await handleSaveSchema();
    }

    await publishMutation.mutateAsync({
      templateId,
      versionId: selectedVersionId,
    });

    toast.success('Versión publicada', {
      description: 'La plantilla está disponible para usar',
    });
  };

  const handleAddNode = (type: NodeType) => {
    const newNode = createEmptyNode(type, nodes.length);
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    setIsDirty(true);
  };

  const handleRemoveNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setEdges(edges.filter((e) => e.from !== nodeId && e.to !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    setIsDirty(true);
  };

  const handleUpdateNode = (updatedNode: TemplateNode) => {
    setNodes(nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
    setIsDirty(true);
  };

  const handleNodesChange = useCallback((newNodes: TemplateNode[]) => {
    setNodes(newNodes);
    setIsDirty(true);
  }, []);

  const handleEdgesChange = useCallback((newEdges: TemplateEdge[]) => {
    setEdges(newEdges);
    setIsDirty(true);
  }, []);

  const handleEdgeClick = useCallback((edge: TemplateEdge) => {
    setSelectedEdge(edge);
    setEdgeModalOpen(true);
  }, []);

  const handleEdgeSave = useCallback(
    (updatedEdge: TemplateEdge) => {
      setEdges((currentEdges) =>
        currentEdges.map((e) =>
          e.from === updatedEdge.from && e.to === updatedEdge.to
            ? updatedEdge
            : e
        )
      );
      setIsDirty(true);
    },
    []
  );

  const handleEdgeDelete = useCallback(
    (edge: TemplateEdge) => {
      setEdges((currentEdges) =>
        currentEdges.filter((e) => !(e.from === edge.from && e.to === edge.to))
      );
      setIsDirty(true);
    },
    []
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-3 h-96" />
          <Skeleton className="col-span-6 h-96" />
          <Skeleton className="col-span-3 h-96" />
        </div>
      </div>
    );
  }

  if (!template) {
    return <div>Template no encontrado</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{nombre}</h2>
            {selectedVersion && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isVersionPublished ? 'default' : 'secondary'}>
                  v{selectedVersion.version}
                  {isVersionPublished ? ' (publicada)' : ' (borrador)'}
                </Badge>
                {isDirty && (
                  <Badge variant="outline" className="text-orange-600">
                    Sin guardar
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVersionPublished ? (
            <Button variant="outline" onClick={handleCreateVersion}>
              Crear nueva versión
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleSaveSchema}
                disabled={!isDirty || updateVersionMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button
                onClick={handlePublish}
                disabled={nodes.length === 0 || publishMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Metadata (collapsible or compact) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Metadatos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nombre</Label>
              <Input
                id="template-name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Descripción</Label>
              <Textarea
                id="template-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={1}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleSaveMetadata}
            disabled={updateTemplateMutation.isPending}
          >
            Guardar metadatos
          </Button>
        </CardContent>
      </Card>

      {/* Main builder area */}
      {!selectedVersion ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Esta plantilla no tiene versiones todavía.
            </p>
            <Button onClick={handleCreateVersion}>
              Crear primera versión
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Left sidebar: Add nodes + Properties */}
          <div className="col-span-3 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <AddNodeToolbar
                  onAddNode={handleAddNode}
                  disabled={isVersionPublished}
                />
              </CardContent>
            </Card>

            {/* Node properties */}
            {selectedNode ? (
              <NodePropertiesEditor
                node={selectedNode}
                onUpdate={handleUpdateNode}
                onDelete={() => handleRemoveNode(selectedNode.id)}
                allNodes={nodes}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Seleccioná un nodo en el canvas para editar sus propiedades
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center: Flow Canvas */}
          <div className="col-span-9">
            <Card className="h-[600px]">
              <CardContent className="p-2 h-full">
                {nodes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p className="mb-2">No hay nodos todavía</p>
                      <p className="text-sm">
                        Usá los botones de la izquierda para agregar nodos al flujo
                      </p>
                    </div>
                  </div>
                ) : (
                  <FlowCanvas
                    templateNodes={nodes}
                    templateEdges={edges}
                    selectedNodeId={selectedNodeId}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onNodeSelect={setSelectedNodeId}
                    onEdgeClick={handleEdgeClick}
                  />
                )}
              </CardContent>
            </Card>

            {/* Help text */}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Arrastrá los nodos para posicionarlos. Conectá nodos arrastrando desde los puntos.
              Hacé click en una conexión para editar su condición.
            </p>
          </div>
        </div>
      )}

      {/* Edge condition modal */}
      <EdgeConditionModal
        open={edgeModalOpen}
        onOpenChange={setEdgeModalOpen}
        edge={selectedEdge}
        nodes={nodes}
        onSave={handleEdgeSave}
        onDelete={handleEdgeDelete}
      />
    </div>
  );
}

// Helper function to create empty nodes with initial position
function createEmptyNode(type: NodeType, index: number): TemplateNode {
  const id = `node_${Date.now()}_${index}`;
  const baseNode = {
    id,
    title: '',
    type,
    position: { x: 250, y: index * 130 + 50 },
  };

  switch (type) {
    case 'decision':
      return {
        ...baseNode,
        type: 'decision',
        key: `decision_${index}`,
        options: [],
        ui: { control: 'radio-cards' },
      };
    case 'step':
      return {
        ...baseNode,
        type: 'step',
        fields: [],
      };
    case 'text':
      return {
        ...baseNode,
        type: 'text',
        key: `text_${index}`,
        placeholder: '',
      };
    case 'checklist':
      return {
        ...baseNode,
        type: 'checklist',
        key: `checklist_${index}`,
        items: [],
      };
    case 'computed':
      return {
        ...baseNode,
        type: 'computed',
        key: 'presupuesto',
        compute: { type: 'presupuesto' },
      };
    case 'review':
      return {
        ...baseNode,
        type: 'review',
      };
    case 'drawing':
      return {
        ...baseNode,
        type: 'drawing',
        key: `drawing_${index}`,
        ui: { width: 400, height: 300, strokeWidth: 4 },
      };
    case 'diagnosis':
      return {
        ...baseNode,
        type: 'diagnosis',
        key: `diagnosis_${index}`,
        options: [],
        ui: { control: 'radio-cards', allowOther: false },
        syncToPaciente: true,
      };
    case 'treatment':
      return {
        ...baseNode,
        type: 'treatment',
        key: `treatment_${index}`,
        ui: { multiSelect: true, showPrice: true, showDescription: false },
        syncToPaciente: true,
      };
    case 'procedure':
      return {
        ...baseNode,
        type: 'procedure',
        key: `procedure_${index}`,
        sourceNodeKey: '',
        ui: { showIndicaciones: true, showProcedimiento: true, allowComments: true },
      };
    case 'budget':
      return {
        ...baseNode,
        type: 'budget',
        key: `budget_${index}`,
        sourceNodeKey: '',
        ui: { allowQuantityEdit: true, allowPriceEdit: false, allowAdditionalItems: false, allowDiscount: true },
        createPresupuesto: false,
      };
  }
}
