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
import type {
  TemplateNode,
  DecisionNode,
  StepNode,
  TextNode,
  ChecklistNode,
  FieldDefinition,
} from '@/types/hc-templates';

interface NodePropertiesEditorProps {
  node: TemplateNode;
  onUpdate: (node: TemplateNode) => void;
  onDelete?: () => void;
}

export function NodePropertiesEditor({ node, onUpdate, onDelete }: NodePropertiesEditorProps) {
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
