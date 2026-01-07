'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TextNode as TextNodeType } from '@/types/hc-templates';

interface TextNodeProps {
  node: TextNodeType;
  value: string;
  onChange: (value: string) => void;
}

export function TextNode({ node, value, onChange }: TextNodeProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor={node.key}>{node.title}</Label>
      <Textarea
        id={node.key}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={node.placeholder || 'Escribir aquí...'}
        rows={8}
        className="resize-none"
      />
    </div>
  );
}
