'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { ChecklistNode as ChecklistNodeType } from '@/types/hc-templates';

interface ChecklistNodeProps {
  node: ChecklistNodeType;
  values: string[];
  onChange: (values: string[]) => void;
}

export function ChecklistNode({ node, values, onChange }: ChecklistNodeProps) {
  const selectedValues = values || [];

  const handleToggle = (itemValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, itemValue]);
    } else {
      onChange(selectedValues.filter((v) => v !== itemValue));
    }
  };

  return (
    <div className="space-y-3">
      <Label>{node.title}</Label>
      <div className="grid gap-3">
        {node.items.map((item) => (
          <div
            key={item.value}
            className="flex items-center space-x-3 p-3 border rounded-lg"
          >
            <Checkbox
              id={`${node.key}-${item.value}`}
              checked={selectedValues.includes(item.value)}
              onCheckedChange={(checked) =>
                handleToggle(item.value, checked as boolean)
              }
            />
            <Label
              htmlFor={`${node.key}-${item.value}`}
              className="font-normal cursor-pointer flex-1"
            >
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
