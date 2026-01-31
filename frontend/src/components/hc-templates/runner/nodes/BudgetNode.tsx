'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import type { BudgetNode as BudgetNodeType } from '@/types/hc-templates';
import type { TratamientoSeleccionado, BudgetData, BudgetItem } from '@/types/tratamiento';

interface BudgetNodeProps {
  node: BudgetNodeType;
  value: BudgetData | undefined;
  onChange: (value: BudgetData) => void;
  answers: Record<string, unknown>;
}

export function BudgetNode({ node, value, onChange, answers }: BudgetNodeProps) {
  const allowQuantityEdit = node.ui?.allowQuantityEdit !== false;
  const allowPriceEdit = node.ui?.allowPriceEdit || false;
  const allowAdditionalItems = node.ui?.allowAdditionalItems || false;
  const allowDiscount = node.ui?.allowDiscount !== false;

  // Get selected treatments from the source node
  const sourceTreatments = useMemo(() => {
    const key = node.sourceNodeKey;
    if (!key) return [];
    const data = answers[key];
    if (!data || !Array.isArray(data)) return [];
    return data as TratamientoSeleccionado[];
  }, [answers, node.sourceNodeKey]);

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Initialize items from value or source treatments (only once)
  useEffect(() => {
    if (initializedRef.current) return;

    if (value?.items?.length) {
      setItems(value.items);
      setDiscountPercent(0);
      setDiscountFixed(value.descuentos || 0);
      initializedRef.current = true;
    } else if (sourceTreatments.length > 0) {
      const newItems = sourceTreatments.map((t) => ({
        descripcion: t.nombre,
        cantidad: t.cantidad || 1,
        precioUnitario: t.precio,
        total: t.precio * (t.cantidad || 1),
        tratamientoId: t.tratamientoId,
      }));
      setItems(newItems);
      initializedRef.current = true;
    }
  }, [value, sourceTreatments]);

  // Calculate totals
  const { subtotal, descuentos, total } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + item.total, 0);
    const discPercent = (sub * discountPercent) / 100;
    const totalDisc = discPercent + discountFixed;
    return {
      subtotal: sub,
      descuentos: totalDisc,
      total: Math.max(0, sub - totalDisc),
    };
  }, [items, discountPercent, discountFixed]);

  // Propagate changes only when user interacts (not on initial load)
  const propagateChanges = useCallback(() => {
    onChangeRef.current({
      items,
      subtotal,
      descuentos,
      total,
    });
  }, [items, subtotal, descuentos, total]);

  // Call propagate when items or discounts change (after initialization)
  useEffect(() => {
    if (initializedRef.current && items.length > 0) {
      propagateChanges();
    }
  }, [items, discountPercent, discountFixed, propagateChanges]);

  const updateItem = (index: number, field: keyof BudgetItem, val: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'cantidad') {
      item.cantidad = Math.max(1, Number(val) || 1);
      item.total = item.cantidad * item.precioUnitario;
    } else if (field === 'precioUnitario') {
      item.precioUnitario = Math.max(0, Number(val) || 0);
      item.total = item.cantidad * item.precioUnitario;
    } else if (field === 'descripcion') {
      item.descripcion = String(val);
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Debug info when no treatments found
  if (items.length === 0 && sourceTreatments.length === 0) {
    // Find keys in answers that look like treatment data (arrays with tratamientoId)
    const possibleTreatmentKeys = Object.entries(answers)
      .filter(([, val]) => Array.isArray(val) && val.length > 0 && val[0]?.tratamientoId)
      .map(([key]) => key);

    return (
      <div className="space-y-3">
        <Label>{node.title}</Label>
        <p className="text-sm text-muted-foreground">
          No hay tratamientos seleccionados para presupuestar.
        </p>
        <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/50 rounded">
          <p>
            <strong>sourceNodeKey configurado:</strong>{' '}
            {node.sourceNodeKey ? `"${node.sourceNodeKey}"` : '(vacío - debe configurarse en el builder)'}
          </p>
          {possibleTreatmentKeys.length > 0 && (
            <p>
              <strong>Keys con tratamientos disponibles:</strong> {possibleTreatmentKeys.join(', ')}
            </p>
          )}
        </div>
        {allowAdditionalItems && (
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar item
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>{node.title}</Label>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Descripción</TableHead>
              <TableHead className="w-[15%] text-center">Cantidad</TableHead>
              <TableHead className="w-[20%] text-right">Precio Unit.</TableHead>
              <TableHead className="w-[20%] text-right">Total</TableHead>
              {allowAdditionalItems && <TableHead className="w-[5%]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  {item.tratamientoId ? (
                    <span className="font-medium">{item.descripcion}</span>
                  ) : (
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                      placeholder="Descripción del item"
                      className="h-8"
                    />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {allowQuantityEdit ? (
                    <Input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                      min={1}
                      className="h-8 w-16 mx-auto text-center"
                    />
                  ) : (
                    item.cantidad
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {allowPriceEdit ? (
                    <Input
                      type="number"
                      value={item.precioUnitario}
                      onChange={(e) => updateItem(index, 'precioUnitario', e.target.value)}
                      min={0}
                      step={0.01}
                      className="h-8 w-24 ml-auto text-right"
                    />
                  ) : (
                    formatCurrency(item.precioUnitario)
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.total)}
                </TableCell>
                {allowAdditionalItems && (
                  <TableCell>
                    {!item.tratamientoId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={allowAdditionalItems ? 3 : 3} className="text-right">
                Subtotal
              </TableCell>
              <TableCell className="text-right font-medium" colSpan={allowAdditionalItems ? 2 : 1}>
                {formatCurrency(subtotal)}
              </TableCell>
            </TableRow>
            {allowDiscount && (
              <TableRow>
                <TableCell colSpan={allowAdditionalItems ? 3 : 3} className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>Descuento</span>
                    <Input
                      type="number"
                      value={discountPercent || ''}
                      onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                      min={0}
                      max={100}
                      placeholder="%"
                      className="h-8 w-16 text-center"
                    />
                    <span>% +</span>
                    <Input
                      type="number"
                      value={discountFixed || ''}
                      onChange={(e) => setDiscountFixed(Number(e.target.value) || 0)}
                      min={0}
                      placeholder="$"
                      className="h-8 w-24 text-right"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right text-red-600 font-medium" colSpan={allowAdditionalItems ? 2 : 1}>
                  -{formatCurrency(descuentos)}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-amber-50">
              <TableCell colSpan={allowAdditionalItems ? 3 : 3} className="text-right font-semibold text-lg">
                Total
              </TableCell>
              <TableCell className="text-right font-bold text-lg text-amber-700" colSpan={allowAdditionalItems ? 2 : 1}>
                {formatCurrency(total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {allowAdditionalItems && (
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar item
        </Button>
      )}
    </div>
  );
}
