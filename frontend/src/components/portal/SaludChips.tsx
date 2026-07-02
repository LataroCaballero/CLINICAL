"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SaludChipsProps {
  label: string;
  sugerencias: string[];
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Componente de chips seleccionables + sugerencias + campo "otro" para el portal del paciente.
 * Emite string[] (NO un string joineado) para compatibilidad con UpdateSaludStagedDto.
 * Reutilizable por las 4 categorias de salud (alergias, medicacion, condiciones).
 */
export function SaludChips({ label, sugerencias, value, onChange }: SaludChipsProps) {
  const [customValue, setCustomValue] = useState("");

  // Fusionar sugerencias + valores ya seleccionados (preserva orden de sugerencias + custom al final)
  const allChips = Array.from(new Set([...sugerencias, ...value]));

  const toggle = (item: string) => {
    const next = value.includes(item)
      ? value.filter((x) => x !== item)
      : [...value, item];
    onChange(next);
  };

  const addCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    onChange(Array.from(new Set([...value, trimmed])));
    setCustomValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-semibold text-base">{label}</p>

      {/* CHIPS (sugerencias + personalizadas) */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {allChips.map((item) => {
            const active = value.includes(item);
            return (
              <motion.div
                key={item}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Badge
                  variant="outline"
                  onClick={() => toggle(item)}
                  className={cn(
                    "cursor-pointer px-3 py-1 rounded-full transition shadow-sm text-sm",
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-blue-100 dark:hover:bg-blue-900"
                  )}
                >
                  {item}
                </Badge>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* AGREGAR OTRO */}
      <div className="flex gap-2">
        <Input
          placeholder={`Agregar otra ${label.toLowerCase()}`}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={addCustom}
          aria-label={`Agregar ${label}`}
          className="px-3 py-2 bg-blue-600 text-white rounded-md flex items-center shrink-0"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
