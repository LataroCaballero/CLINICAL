"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandEmpty,
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategorias } from "@/hooks/useProductos";

interface CategoriaProductoComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoriaProductoCombobox({
  value,
  onChange,
}: CategoriaProductoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: categorias = [] } = useCategorias();

  // Filtrar categorías por query
  const categoriasFiltradas = categorias.filter((cat) =>
    cat.toLowerCase().includes(query.toLowerCase())
  );

  const exists = categorias.some(
    (cat) => cat.toLowerCase() === query.toLowerCase()
  );

  // Crear nueva categoría (simplemente se guarda en el producto)
  const handleCreate = () => {
    if (!query.trim()) return;
    onChange(query.trim());
    setOpen(false);
    setQuery("");
  };

  const handleSelect = (cat: string) => {
    onChange(cat);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {value || "Seleccionar categoría"}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!exists && query) handleCreate();
              }
            }}
          >
            <CommandInput
              placeholder="Buscar o crear categoría..."
              value={query}
              onValueChange={setQuery}
            />

            {!exists && query && (
              <CommandItem
                className="flex items-center gap-2 cursor-pointer px-3 py-2"
                onSelect={handleCreate}
              >
                <Plus className="h-4 w-4" />
                Crear categoría: "{query}"
              </CommandItem>
            )}

            <CommandEmpty>No hay categorías</CommandEmpty>

            <CommandGroup heading="Categorías existentes">
              <AnimatePresence>
                {categoriasFiltradas.map((cat) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <CommandItem
                      onSelect={() => handleSelect(cat)}
                      className="flex items-center px-3 py-2 gap-2 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === cat ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{cat}</span>
                    </CommandItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
