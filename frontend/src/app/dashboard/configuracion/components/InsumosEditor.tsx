"use client";

import { useState, useEffect } from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandEmpty,
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventario } from "@/hooks/useInventario";
import type { Inventario } from "@/types/stock";

export interface InsumoLocal {
  productoId: string;
  nombre: string;
  cantidad: number;
  costoBase: number | null;
  unidadMedida: string | null;
}

interface InsumosEditorProps {
  profesionalId?: string;
  initialInsumos?: InsumoLocal[];
  onChange: (insumos: InsumoLocal[]) => void;
}

export function InsumosEditor({
  initialInsumos,
  onChange,
}: InsumosEditorProps) {
  const [insumos, setInsumos] = useState<InsumoLocal[]>(initialInsumos ?? []);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: inventario = [] } = useInventario();

  // Sync with initialInsumos when parent resets (e.g., modal reopens for different item)
  useEffect(() => {
    setInsumos(initialInsumos ?? []);
  }, [initialInsumos]);

  // Filter products: match search string, exclude already-added products
  const addedProductIds = new Set(insumos.map((i) => i.productoId));
  const filtered = inventario.filter(
    (item: Inventario) =>
      !addedProductIds.has(item.producto.id) &&
      item.producto.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = (inventarioItem: Inventario) => {
    const nuevo: InsumoLocal = {
      productoId: inventarioItem.producto.id,
      nombre: inventarioItem.producto.nombre,
      cantidad: 1,
      costoBase:
        inventarioItem.producto.costoBase !== undefined
          ? Number(inventarioItem.producto.costoBase)
          : null,
      unidadMedida: inventarioItem.producto.unidadMedida ?? null,
    };
    const updated = [...insumos, nuevo];
    setInsumos(updated);
    onChange(updated);
    setOpen(false);
    setSearch("");
  };

  const handleCantidadChange = (productoId: string, value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return;
    const updated = insumos.map((i) =>
      i.productoId === productoId ? { ...i, cantidad: parsed } : i,
    );
    setInsumos(updated);
    onChange(updated);
  };

  const handleRemove = (productoId: string) => {
    const updated = insumos.filter((i) => i.productoId !== productoId);
    setInsumos(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Combobox to add new insumo */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-sm">
            + Agregar insumo
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0">
          <Command>
            <CommandInput
              placeholder="Buscar producto..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandEmpty>No se encontraron productos</CommandEmpty>
            <CommandGroup>
              {filtered.map((item: Inventario) => (
                <CommandItem
                  key={item.id}
                  value={item.producto.nombre}
                  onSelect={() => handleAdd(item)}
                  className="cursor-pointer text-sm"
                >
                  <span className="flex-1">{item.producto.nombre}</span>
                  {item.producto.unidadMedida && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {item.producto.unidadMedida}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Compact table of added insumos */}
      {insumos.length > 0 && (
        <table className="w-full text-sm border rounded overflow-hidden">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th className="text-left py-1 px-2 font-medium">Producto</th>
              <th className="text-left py-1 px-2 font-medium w-24">Cantidad</th>
              <th className="py-1 px-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {insumos.map((insumo) => (
              <tr key={insumo.productoId} className="border-t">
                <td className="py-1 px-2">
                  <span>{insumo.nombre}</span>
                  {insumo.unidadMedida && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({insumo.unidadMedida})
                    </span>
                  )}
                </td>
                <td className="py-1 px-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={insumo.cantidad}
                    onChange={(e) =>
                      handleCantidadChange(insumo.productoId, e.target.value)
                    }
                    className="h-7 w-20 text-sm"
                  />
                </td>
                <td className="py-1 px-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(insumo.productoId)}
                    type="button"
                  >
                    ×
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
