'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import { useCreatePresupuesto, type PresupuestoItemInput } from '@/hooks/useCreatePresupuesto';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import EnviarPresupuestoModal from '@/components/presupuesto/EnviarPresupuestoModal';

interface Props {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
  profesionalId: string;
  pacienteEmail?: string;
  initialItems: PresupuestoItemInput[];
  onCreated: (presupuesto: Presupuesto) => void;
}

export function GenerarPresupuestoModal({
  open,
  onClose,
  pacienteId,
  profesionalId,
  pacienteEmail = '',
  initialItems,
  onCreated,
}: Props) {
  const [items, setItems] = useState<PresupuestoItemInput[]>(initialItems);
  const [descuentos, setDescuentos] = useState(0);
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [fechaValidez, setFechaValidez] = useState('');
  const [createdPresupuesto, setCreatedPresupuesto] = useState<Presupuesto | null>(null);
  const [showEnviar, setShowEnviar] = useState(false);

  const createPresupuesto = useCreatePresupuesto();

  const subtotal = items.reduce((acc, it) => acc + it.precioTotal, 0);
  const total = Math.max(0, subtotal - descuentos);

  const updateItem = (index: number, field: keyof PresupuestoItemInput, value: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { descripcion: '', precioTotal: 0 }]);
  };

  const handleCreate = async () => {
    const validItems = items.filter((it) => it.descripcion.trim());
    if (validItems.length === 0) return;

    const result = await createPresupuesto.mutateAsync({
      pacienteId,
      profesionalId,
      items: validItems,
      descuentos,
      moneda,
      fechaValidez: fechaValidez || undefined,
    });

    setCreatedPresupuesto(result);
    onCreated(result);
    setShowEnviar(true);
  };

  if (showEnviar && createdPresupuesto) {
    return (
      <EnviarPresupuestoModal
        open={true}
        onClose={() => {
          setShowEnviar(false);
          onClose();
        }}
        presupuestoId={createdPresupuesto.id}
        pacienteId={pacienteId}
        pacienteEmail={pacienteEmail}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar Presupuesto</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          {/* Items */}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={item.descripcion}
                  onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                  placeholder="Descripción"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  value={item.precioTotal}
                  onChange={(e) => updateItem(index, 'precioTotal', Number(e.target.value))}
                  placeholder="Precio"
                  className="w-28"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
              <Plus className="w-3 h-3" /> Agregar item
            </Button>
          </div>

          {/* Descuento */}
          <div className="flex gap-4 items-end">
            <div className="space-y-1 flex-1">
              <Label>Descuento</Label>
              <Input
                type="number"
                min={0}
                value={descuentos}
                onChange={(e) => setDescuentos(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1 w-24">
              <Label>Moneda</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD')}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="space-y-1 flex-1">
              <Label>Válido hasta</Label>
              <Input
                type="date"
                value={fechaValidez}
                onChange={(e) => setFechaValidez(e.target.value)}
              />
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t font-semibold">
            <span>Total</span>
            <span>
              {moneda} {total.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createPresupuesto.isPending || items.filter((it) => it.descripcion.trim()).length === 0}
          >
            {createPresupuesto.isPending ? 'Creando...' : 'Crear Presupuesto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
