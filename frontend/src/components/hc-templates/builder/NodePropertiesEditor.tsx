'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  TemplateNode,
  DecisionNode,
  StepNode,
  TextNode,
  ChecklistNode,
  FieldDefinition,
  DrawingNode,
  DiagnosisNode,
  TreatmentNode,
  ProcedureNode,
  BudgetNode,
} from '@/types/hc-templates';

interface NodePropertiesEditorProps {
  node: TemplateNode;
  onUpdate: (node: TemplateNode) => void;
  onDelete?: () => void;
  allNodes?: TemplateNode[];
}

export function NodePropertiesEditor({ node, onUpdate, onDelete, allNodes = [] }: NodePropertiesEditorProps) {
  const updateField = <K extends keyof TemplateNode>(
    field: K,
    value: TemplateNode[K]
  ) => {
    onUpdate({ ...node, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Propiedades del Nodo</CardTitle>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common fields */}
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={node.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Título del nodo"
          />
        </div>

        {/* Type-specific fields */}
        {node.type === 'decision' && (
          <DecisionNodeEditor
            node={node as DecisionNode}
            onUpdate={onUpdate}
          />
        )}

        {node.type === 'step' && (
          <StepNodeEditor node={node as StepNode} onUpdate={onUpdate} />
        )}

        {node.type === 'text' && (
          <TextNodeEditor node={node as TextNode} onUpdate={onUpdate} />
        )}

        {node.type === 'checklist' && (
          <ChecklistNodeEditor
            node={node as ChecklistNode}
            onUpdate={onUpdate}
          />
        )}

        {node.type === 'computed' && (
          <div className="text-sm text-muted-foreground">
            Este nodo calcula automáticamente el presupuesto basado en las
            selecciones anteriores.
          </div>
        )}

        {node.type === 'review' && (
          <div className="text-sm text-muted-foreground">
            Este nodo muestra un resumen de todas las respuestas antes de
            finalizar.
          </div>
        )}

        {node.type === 'drawing' && (
          <DrawingNodeEditor node={node as DrawingNode} onUpdate={onUpdate} />
        )}

        {node.type === 'diagnosis' && (
          <DiagnosisNodeEditor node={node as DiagnosisNode} onUpdate={onUpdate} />
        )}

        {node.type === 'treatment' && (
          <TreatmentNodeEditor node={node as TreatmentNode} onUpdate={onUpdate} />
        )}

        {node.type === 'procedure' && (
          <ProcedureNodeEditor node={node as ProcedureNode} onUpdate={onUpdate} allNodes={allNodes} />
        )}

        {node.type === 'budget' && (
          <BudgetNodeEditor node={node as BudgetNode} onUpdate={onUpdate} allNodes={allNodes} />
        )}
      </CardContent>
    </Card>
  );
}

function DecisionNodeEditor({
  node,
  onUpdate,
}: {
  node: DecisionNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  const addOption = () => {
    const newOptions = [
      ...node.options,
      { value: `option_${node.options.length + 1}`, label: '' },
    ];
    onUpdate({ ...node, options: newOptions });
  };

  const updateOption = (index: number, field: 'value' | 'label', value: string) => {
    const newOptions = [...node.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onUpdate({ ...node, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = node.options.filter((_, i) => i !== index);
    onUpdate({ ...node, options: newOptions });
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="key">Key (identificador)</Label>
        <Input
          id="key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: motivo_consulta"
        />
      </div>

      <div className="space-y-2">
        <Label>Control UI</Label>
        <Select
          value={node.ui?.control || 'radio-cards'}
          onValueChange={(value) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, control: value as 'radio-cards' | 'select' },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="radio-cards">Tarjetas (Radio)</SelectItem>
            <SelectItem value="select">Dropdown</SelectItem>
            <SelectItem value="multi-select">Multi-selección</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Opciones</Label>
          <Button variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {node.options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option.label}
                onChange={(e) => updateOption(index, 'label', e.target.value)}
                placeholder="Etiqueta"
                className="flex-1"
              />
              <Input
                value={option.value}
                onChange={(e) => updateOption(index, 'value', e.target.value)}
                placeholder="Valor"
                className="w-32"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StepNodeEditor({
  node,
  onUpdate,
}: {
  node: StepNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  const addField = () => {
    const newFields: FieldDefinition[] = [
      ...node.fields,
      {
        key: `field_${node.fields.length + 1}`,
        label: '',
        type: 'text',
      },
    ];
    onUpdate({ ...node, fields: newFields });
  };

  const updateFieldDef = (
    index: number,
    field: keyof FieldDefinition,
    value: string | boolean
  ) => {
    const newFields = [...node.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    onUpdate({ ...node, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = node.fields.filter((_, i) => i !== index);
    onUpdate({ ...node, fields: newFields });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Campos</Label>
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>
      <div className="space-y-3">
        {node.fields.map((field, index) => (
          <Card key={index} className="p-3">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={field.label}
                  onChange={(e) => updateFieldDef(index, 'label', e.target.value)}
                  placeholder="Etiqueta"
                  className="flex-1"
                />
                <Select
                  value={field.type}
                  onValueChange={(value) => updateFieldDef(index, 'type', value)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="textarea">Texto largo</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="date">Fecha</SelectItem>
                    <SelectItem value="checkbox">Check</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={field.key}
                onChange={(e) => updateFieldDef(index, 'key', e.target.value)}
                placeholder="Key"
                className="text-xs"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TextNodeEditor({
  node,
  onUpdate,
}: {
  node: TextNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="text-key">Key (identificador)</Label>
        <Input
          id="text-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: observaciones"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="placeholder">Placeholder</Label>
        <Input
          id="placeholder"
          value={node.placeholder || ''}
          onChange={(e) => onUpdate({ ...node, placeholder: e.target.value })}
          placeholder="Texto de ayuda..."
        />
      </div>
    </>
  );
}

function ChecklistNodeEditor({
  node,
  onUpdate,
}: {
  node: ChecklistNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  const addItem = () => {
    const newItems = [
      ...node.items,
      { value: `item_${node.items.length + 1}`, label: '' },
    ];
    onUpdate({ ...node, items: newItems });
  };

  const updateItem = (index: number, field: 'value' | 'label', value: string) => {
    const newItems = [...node.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ ...node, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = node.items.filter((_, i) => i !== index);
    onUpdate({ ...node, items: newItems });
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="checklist-key">Key (identificador)</Label>
        <Input
          id="checklist-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: productos_seleccionados"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Items</Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {node.items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item.label}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
                placeholder="Etiqueta"
                className="flex-1"
              />
              <Input
                value={item.value}
                onChange={(e) => updateItem(index, 'value', e.target.value)}
                placeholder="Valor"
                className="w-32"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function DrawingNodeEditor({
  node,
  onUpdate,
}: {
  node: DrawingNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="drawing-key">Key (identificador)</Label>
        <Input
          id="drawing-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: dibujo_zona"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="drawing-width">Ancho (px)</Label>
          <Input
            id="drawing-width"
            type="number"
            value={node.ui?.width || 400}
            onChange={(e) =>
              onUpdate({
                ...node,
                ui: { ...node.ui, width: parseInt(e.target.value) || 400 },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="drawing-height">Alto (px)</Label>
          <Input
            id="drawing-height"
            type="number"
            value={node.ui?.height || 300}
            onChange={(e) =>
              onUpdate({
                ...node,
                ui: { ...node.ui, height: parseInt(e.target.value) || 300 },
              })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="drawing-stroke">Grosor del trazo</Label>
        <Input
          id="drawing-stroke"
          type="number"
          value={node.ui?.strokeWidth || 4}
          onChange={(e) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, strokeWidth: parseInt(e.target.value) || 4 },
            })
          }
        />
      </div>
    </>
  );
}

function DiagnosisNodeEditor({
  node,
  onUpdate,
}: {
  node: DiagnosisNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  const addOption = () => {
    const newOptions = [
      ...node.options,
      { value: `option_${node.options.length + 1}`, label: '' },
    ];
    onUpdate({ ...node, options: newOptions });
  };

  const updateOption = (index: number, field: 'value' | 'label', value: string) => {
    const newOptions = [...node.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onUpdate({ ...node, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = node.options.filter((_, i) => i !== index);
    onUpdate({ ...node, options: newOptions });
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="diagnosis-key">Key (identificador)</Label>
        <Input
          id="diagnosis-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: diagnostico"
        />
      </div>

      <div className="space-y-2">
        <Label>Control UI</Label>
        <Select
          value={node.ui?.control || 'radio-cards'}
          onValueChange={(value) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, control: value as 'radio-cards' | 'select' },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="radio-cards">Tarjetas (Radio)</SelectItem>
            <SelectItem value="select">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="diagnosis-allowOther"
          checked={node.ui?.allowOther || false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, allowOther: checked === true },
            })
          }
        />
        <Label htmlFor="diagnosis-allowOther" className="font-normal">
          Permitir opción &quot;Otro&quot;
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="diagnosis-sync"
          checked={node.syncToPaciente !== false}
          onCheckedChange={(checked) =>
            onUpdate({ ...node, syncToPaciente: checked === true })
          }
        />
        <Label htmlFor="diagnosis-sync" className="font-normal">
          Sincronizar con paciente
        </Label>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Opciones de diagnóstico</Label>
          <Button variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {node.options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option.label}
                onChange={(e) => updateOption(index, 'label', e.target.value)}
                placeholder="Etiqueta"
                className="flex-1"
              />
              <Input
                value={option.value}
                onChange={(e) => updateOption(index, 'value', e.target.value)}
                placeholder="Valor"
                className="w-32"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TreatmentNodeEditor({
  node,
  onUpdate,
}: {
  node: TreatmentNode;
  onUpdate: (node: TemplateNode) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="treatment-key">Key (identificador)</Label>
        <Input
          id="treatment-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: tratamientos_seleccionados"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="treatment-multiSelect"
          checked={node.ui?.multiSelect !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, multiSelect: checked === true },
            })
          }
        />
        <Label htmlFor="treatment-multiSelect" className="font-normal">
          Permitir selección múltiple
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="treatment-showPrice"
          checked={node.ui?.showPrice !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, showPrice: checked === true },
            })
          }
        />
        <Label htmlFor="treatment-showPrice" className="font-normal">
          Mostrar precio
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="treatment-showDescription"
          checked={node.ui?.showDescription || false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, showDescription: checked === true },
            })
          }
        />
        <Label htmlFor="treatment-showDescription" className="font-normal">
          Mostrar descripción
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="treatment-sync"
          checked={node.syncToPaciente !== false}
          onCheckedChange={(checked) =>
            onUpdate({ ...node, syncToPaciente: checked === true })
          }
        />
        <Label htmlFor="treatment-sync" className="font-normal">
          Sincronizar con paciente
        </Label>
      </div>

      <div className="text-sm text-muted-foreground mt-2">
        Por defecto muestra todos los tratamientos del profesional.
        Opcionalmente se pueden filtrar tratamientos específicos.
      </div>
    </>
  );
}

function ProcedureNodeEditor({
  node,
  onUpdate,
  allNodes,
}: {
  node: ProcedureNode;
  onUpdate: (node: TemplateNode) => void;
  allNodes: TemplateNode[];
}) {
  // Find all treatment nodes in the template
  const treatmentNodes = allNodes.filter((n) => n.type === 'treatment') as TreatmentNode[];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="procedure-key">Key (identificador)</Label>
        <Input
          id="procedure-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: procedimiento_info"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="procedure-source">Nodo de tratamiento fuente</Label>
        {treatmentNodes.length > 0 ? (
          <Select
            value={node.sourceNodeKey || ''}
            onValueChange={(value) => onUpdate({ ...node, sourceNodeKey: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un nodo de tratamiento" />
            </SelectTrigger>
            <SelectContent>
              {treatmentNodes.map((tn) => (
                <SelectItem key={tn.key} value={tn.key}>
                  {tn.title || tn.key} ({tn.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded">
            No hay nodos de tratamiento en esta plantilla. Agregá uno primero.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          El nodo de tratamiento del cual obtener la información.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="procedure-indicaciones"
          checked={node.ui?.showIndicaciones !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, showIndicaciones: checked === true },
            })
          }
        />
        <Label htmlFor="procedure-indicaciones" className="font-normal">
          Mostrar indicaciones
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="procedure-procedimiento"
          checked={node.ui?.showProcedimiento !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, showProcedimiento: checked === true },
            })
          }
        />
        <Label htmlFor="procedure-procedimiento" className="font-normal">
          Mostrar procedimiento
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="procedure-comments"
          checked={node.ui?.allowComments !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, allowComments: checked === true },
            })
          }
        />
        <Label htmlFor="procedure-comments" className="font-normal">
          Permitir comentarios
        </Label>
      </div>
    </>
  );
}

function BudgetNodeEditor({
  node,
  onUpdate,
  allNodes,
}: {
  node: BudgetNode;
  onUpdate: (node: TemplateNode) => void;
  allNodes: TemplateNode[];
}) {
  // Find all treatment nodes in the template
  const treatmentNodes = allNodes.filter((n) => n.type === 'treatment') as TreatmentNode[];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="budget-key">Key (identificador)</Label>
        <Input
          id="budget-key"
          value={node.key}
          onChange={(e) => onUpdate({ ...node, key: e.target.value })}
          placeholder="ej: presupuesto"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget-source">Nodo de tratamiento fuente</Label>
        {treatmentNodes.length > 0 ? (
          <Select
            value={node.sourceNodeKey || ''}
            onValueChange={(value) => onUpdate({ ...node, sourceNodeKey: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un nodo de tratamiento" />
            </SelectTrigger>
            <SelectContent>
              {treatmentNodes.map((tn) => (
                <SelectItem key={tn.key} value={tn.key}>
                  {tn.title || tn.key} ({tn.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded">
            No hay nodos de tratamiento en esta plantilla. Agregá uno primero.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          El nodo de tratamiento del cual obtener los items.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="budget-quantity"
          checked={node.ui?.allowQuantityEdit !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, allowQuantityEdit: checked === true },
            })
          }
        />
        <Label htmlFor="budget-quantity" className="font-normal">
          Permitir editar cantidad
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="budget-price"
          checked={node.ui?.allowPriceEdit || false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, allowPriceEdit: checked === true },
            })
          }
        />
        <Label htmlFor="budget-price" className="font-normal">
          Permitir editar precio
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="budget-additional"
          checked={node.ui?.allowAdditionalItems || false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, allowAdditionalItems: checked === true },
            })
          }
        />
        <Label htmlFor="budget-additional" className="font-normal">
          Permitir agregar items adicionales
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="budget-discount"
          checked={node.ui?.allowDiscount !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...node,
              ui: { ...node.ui, allowDiscount: checked === true },
            })
          }
        />
        <Label htmlFor="budget-discount" className="font-normal">
          Permitir aplicar descuento
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="budget-create"
          checked={node.createPresupuesto || false}
          onCheckedChange={(checked) =>
            onUpdate({ ...node, createPresupuesto: checked === true })
          }
        />
        <Label htmlFor="budget-create" className="font-normal">
          Crear presupuesto al finalizar
        </Label>
      </div>
    </>
  );
}
