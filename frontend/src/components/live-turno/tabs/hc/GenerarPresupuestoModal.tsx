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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useCirugiasCatalogo } from '@/hooks/useCirugiasCatalogo';
import { useTratamientosProfesional } from '@/hooks/useTratamientosProfesional';
import type { CirugiaCatalogo } from '@/types/cirugia-catalogo';
import type { TratamientoConInsumos } from '@/types/tratamiento';

interface ItemWithMeta {
  descripcion: string;
  precioTotal: number;
  fromCatalog?: boolean;
}

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
  const [items, setItems] = useState<ItemWithMeta[]>(initialItems);
  const [descuentos, setDescuentos] = useState(0);
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [fechaValidez, setFechaValidez] = useState('');
  const [createdPresupuesto, setCreatedPresupuesto] = useState<Presupuesto | null>(null);
  const [showEnviar, setShowEnviar] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const { data: cirugias = [], isLoading: loadingCirugias } = useCirugiasCatalogo(profesionalId);
  const { data: tratamientos = [], isLoading: loadingTratamientos } = useTratamientosProfesional(false, profesionalId);

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

  const addFromCatalog = (descripcion: string, precioTotal: number) => {
    setItems((prev) => [...prev, { descripcion, precioTotal, fromCatalog: true }]);
  };

  const handleSelectCirugia = (c: CirugiaCatalogo) => {
    const precio = moneda === 'USD'
      ? (c.precioUSD ?? c.precioARS ?? 0)
      : (c.precioARS ?? 0);
    addFromCatalog(c.nombre, precio);
    setCatalogOpen(false);
  };

  const handleSelectTratamiento = (t: TratamientoConInsumos) => {
    addFromCatalog(t.nombre, t.precio ?? 0);
    setCatalogOpen(false);
  };

  const handleCreate = async () => {
    const validItems: PresupuestoItemInput[] = items
      .filter((it) => it.descripcion.trim())
      .map(({ descripcion, precioTotal }) => ({ descripcion, precioTotal }));
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
                {item.fromCatalog && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Catálogo
                  </Badge>
                )}
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
            <div className="flex gap-2 flex-wrap">
              <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="w-3 h-3" /> Agregar del catálogo
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cirugía o tratamiento..." />
                    <CommandEmpty>
                      {loadingCirugias || loadingTratamientos
                        ? 'Cargando catálogo...'
                        : cirugias.length === 0 && tratamientos.length === 0
                          ? 'No hay ítems en el catálogo. Creá cirugías o tratamientos en Configuración.'
                          : 'Sin resultados.'}
                    </CommandEmpty>
                    <CommandGroup heading="Cirugías">
                      {cirugias.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.nombre}
                          onSelect={() => handleSelectCirugia(c)}
                        >
                          <span className="flex-1 truncate">{c.nombre}</span>
                          <span className="text-muted-foreground text-xs ml-2 shrink-0">
                            ARS {c.precioARS != null ? c.precioARS.toLocaleString('es-AR') : '—'}
                            {c.precioUSD != null && ` · USD ${c.precioUSD.toLocaleString('es-AR')}`}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Tratamientos">
                      {tratamientos.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.nombre}
                          onSelect={() => handleSelectTratamiento(t)}
                        >
                          <span className="flex-1 truncate">{t.nombre}</span>
                          <span className="text-muted-foreground text-xs ml-2 shrink-0">
                            ARS {t.precio != null ? t.precio.toLocaleString('es-AR') : '—'}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="w-3 h-3" /> Agregar ítem libre
              </Button>
            </div>
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
