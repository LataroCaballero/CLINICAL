'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DiagnosisNode as DiagnosisNodeType } from '@/types/hc-templates';

interface DiagnosisNodeProps {
  node: DiagnosisNodeType;
  value: string | { value: string; otherText?: string } | undefined;
  onChange: (value: string | { value: string; otherText?: string }) => void;
}

export function DiagnosisNode({ node, value, onChange }: DiagnosisNodeProps) {
  const control = node.ui?.control || 'radio-cards';
  const allowOther = node.ui?.allowOther || false;

  const currentValue = typeof value === 'object' ? value.value : value;
  const otherText = typeof value === 'object' ? value.otherText : '';
  const [showOtherInput, setShowOtherInput] = useState(currentValue === '__other__');

  const handleChange = (newValue: string) => {
    if (newValue === '__other__') {
      setShowOtherInput(true);
      onChange({ value: '__other__', otherText: '' });
    } else {
      setShowOtherInput(false);
      onChange(newValue);
    }
  };

  const handleOtherTextChange = (text: string) => {
    onChange({ value: '__other__', otherText: text });
  };

  const optionsWithOther = allowOther
    ? [...node.options, { value: '__other__', label: 'Otro' }]
    : node.options;

  if (control === 'select') {
    return (
      <div className="space-y-3">
        <Label>{node.title}</Label>
        <Select value={currentValue} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar diagnóstico..." />
          </SelectTrigger>
          <SelectContent>
            {optionsWithOther.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showOtherInput && allowOther && (
          <Input
            placeholder="Especificar diagnóstico..."
            value={otherText || ''}
            onChange={(e) => handleOtherTextChange(e.target.value)}
          />
        )}
      </div>
    );
  }

  // Default: radio-cards
  return (
    <div className="space-y-3">
      <Label>{node.title}</Label>
      <RadioGroup
        value={currentValue}
        onValueChange={handleChange}
        className="grid gap-3"
      >
        {optionsWithOther.map((option) => (
          <Label
            key={option.value}
            htmlFor={`${node.key}-${option.value}`}
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              currentValue === option.value
                ? 'border-indigo-500 bg-indigo-50'
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
      {showOtherInput && allowOther && (
        <Input
          placeholder="Especificar diagnóstico..."
          value={otherText || ''}
          onChange={(e) => handleOtherTextChange(e.target.value)}
        />
      )}
    </div>
  );
}
