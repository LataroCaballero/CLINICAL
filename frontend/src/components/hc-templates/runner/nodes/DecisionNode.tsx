'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { DecisionNode as DecisionNodeType } from '@/types/hc-templates';

interface DecisionNodeProps {
  node: DecisionNodeType;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}

export function DecisionNode({ node, value, onChange }: DecisionNodeProps) {
  const control = node.ui?.control || 'radio-cards';

  if (control === 'select') {
    return (
      <div className="space-y-2">
        <Label>{node.title}</Label>
        <Select value={value as string} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {node.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (control === 'multi-select') {
    const selectedValues = (value as string[]) || [];

    return (
      <div className="space-y-3">
        <Label>{node.title}</Label>
        <div className="grid gap-2">
          {node.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${node.key}-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedValues, option.value]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== option.value));
                  }
                }}
              />
              <Label
                htmlFor={`${node.key}-${option.value}`}
                className="font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: radio-cards
  return (
    <div className="space-y-3">
      <Label>{node.title}</Label>
      <RadioGroup
        value={value as string}
        onValueChange={onChange}
        className="grid gap-3"
      >
        {node.options.map((option) => (
          <Label
            key={option.value}
            htmlFor={`${node.key}-${option.value}`}
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`${node.key}-${option.value}`}
            />
            <span className="font-medium">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
