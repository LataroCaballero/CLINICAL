'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { TemplateSchema, ReviewNode as ReviewNodeType } from '@/types/hc-templates';

interface ReviewNodeProps {
  node: ReviewNodeType;
  schema: TemplateSchema;
  answers: Record<string, unknown>;
  computed: Record<string, unknown>;
}

export function ReviewNode({ node, schema, answers, computed }: ReviewNodeProps) {
  // Get all answered nodes
  const answeredNodes = schema.nodes.filter((n) => {
    if (n.type === 'review') return false;
    if (n.type === 'decision' || n.type === 'text' || n.type === 'checklist') {
      const key = 'key' in n ? n.key : n.id;
      return answers[key] !== undefined;
    }
    if (n.type === 'step') {
      return n.fields.some((f) => answers[f.key] !== undefined);
    }
    return false;
  });

  const getAnswerDisplay = (nodeItem: (typeof schema.nodes)[0]) => {
    if (nodeItem.type === 'decision') {
      const value = answers[nodeItem.key];
      if (Array.isArray(value)) {
        const labels = value.map((v) => {
          const opt = nodeItem.options.find((o) => o.value === v);
          return opt?.label || v;
        });
        return labels.map((label) => (
          <Badge key={label} variant="secondary" className="mr-1">
            {label}
          </Badge>
        ));
      }
      const opt = nodeItem.options.find((o) => o.value === value);
      return <Badge variant="secondary">{opt?.label || String(value)}</Badge>;
    }

    if (nodeItem.type === 'text') {
      const value = answers[nodeItem.key];
      return (
        <p className="text-sm whitespace-pre-wrap">
          {String(value || '(vacío)')}
        </p>
      );
    }

    if (nodeItem.type === 'checklist') {
      const values = answers[nodeItem.key] as string[] | undefined;
      if (!values?.length) return <span className="text-muted-foreground">(ninguno)</span>;
      return values.map((v) => {
        const item = nodeItem.items.find((i) => i.value === v);
        return (
          <Badge key={v} variant="outline" className="mr-1">
            {item?.label || v}
          </Badge>
        );
      });
    }

    if (nodeItem.type === 'step') {
      return (
        <div className="space-y-1">
          {nodeItem.fields.map((field) => {
            const value = answers[field.key];
            if (value === undefined || value === '') return null;
            return (
              <div key={field.key} className="text-sm">
                <span className="text-muted-foreground">{field.label}:</span>{' '}
                <span>{String(value)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{node.title}</h3>
      <p className="text-sm text-muted-foreground">
        Revisá la información antes de finalizar.
      </p>

      <div className="space-y-4">
        {answeredNodes.map((nodeItem) => (
          <Card key={nodeItem.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {nodeItem.title}
              </CardTitle>
            </CardHeader>
            <CardContent>{getAnswerDisplay(nodeItem)}</CardContent>
          </Card>
        ))}
      </div>

      {computed && Object.keys(computed).length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Datos calculados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(computed, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
