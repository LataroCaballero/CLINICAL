'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { StepNode as StepNodeType } from '@/types/hc-templates';

interface StepNodeProps {
  node: StepNodeType;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function StepNode({ node, values, onChange }: StepNodeProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">{node.title}</h3>
      <div className="grid gap-4">
        {node.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {field.type === 'text' && (
              <Input
                id={field.key}
                value={(values[field.key] as string) || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                id={field.key}
                value={(values[field.key] as string) || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
              />
            )}

            {field.type === 'number' && (
              <Input
                id={field.key}
                type="number"
                value={(values[field.key] as number) || ''}
                onChange={(e) => onChange(field.key, parseFloat(e.target.value))}
                placeholder={field.placeholder}
                min={field.validation?.min}
                max={field.validation?.max}
              />
            )}

            {field.type === 'date' && (
              <Input
                id={field.key}
                type="date"
                value={(values[field.key] as string) || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}

            {field.type === 'checkbox' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.key}
                  checked={(values[field.key] as boolean) || false}
                  onCheckedChange={(checked) => onChange(field.key, checked)}
                />
                <Label htmlFor={field.key} className="font-normal">
                  {field.label}
                </Label>
              </div>
            )}

            {field.type === 'richtext' && (
              <Textarea
                id={field.key}
                value={(values[field.key] as string) || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={6}
                className="font-mono text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
