'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ComputedNode as ComputedNodeType } from '@/types/hc-templates';

interface PresupuestoComputed {
  items?: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  subtotal?: number;
  descuentos?: number;
  total?: number;
}

interface ComputedNodeProps {
  node: ComputedNodeType;
  computed: PresupuestoComputed;
  answers: Record<string, unknown>;
}

export function ComputedNode({ node, computed }: ComputedNodeProps) {
  const items = computed?.items || [];
  const subtotal = computed?.subtotal || 0;
  const descuentos = computed?.descuentos || 0;
  const total = computed?.total || subtotal - descuentos;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{node.title}</h3>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay items seleccionados todavía.
              <br />
              El presupuesto se calculará automáticamente según tus selecciones.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <div>
                      <span>{item.descripcion}</span>
                      {item.cantidad > 1 && (
                        <span className="text-muted-foreground ml-2">
                          x{item.cantidad}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {descuentos > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuentos</span>
                    <span>-{formatCurrency(descuentos)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Los precios son estimativos y pueden variar según evaluación profesional.
      </p>
    </div>
  );
}
